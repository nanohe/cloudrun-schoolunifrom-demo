const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 数据库连接状态
let dbConnected = false;

// 健康检查端点
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 80,
    database: dbConnected ? "connected" : "disconnected"
  });
});

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  try {
    if (!dbConnected) {
      return res.send({
        code: -1,
        error: "数据库未连接",
        data: 0
      });
    }

    const { action } = req.body;
    if (action === "inc") {
      await Counter.create();
    } else if (action === "clear") {
      await Counter.destroy({
        truncate: true,
      });
    }
    res.send({
      code: 0,
      data: await Counter.count(),
    });
  } catch (error) {
    console.error("Count API error:", error);
    res.send({
      code: -1,
      error: error.message,
      data: 0
    });
  }
});

// 获取计数
app.get("/api/count", async (req, res) => {
  try {
    if (!dbConnected) {
      return res.send({
        code: -1,
        error: "数据库未连接",
        data: 0
      });
    }

    const result = await Counter.count();
    res.send({
      code: 0,
      data: result,
    });
  } catch (error) {
    console.error("Get count error:", error);
    res.send({
      code: -1,
      error: error.message,
      data: 0
    });
  }
});

// 数据库状态检查端点
app.get("/api/db-status", async (req, res) => {
  const { sequelize } = require("./db");
  
  try {
    if (!dbConnected) {
      return res.json({
        status: "disconnected",
        error: "数据库未连接",
        config: {
          host: process.env.MYSQL_ADDRESS?.split(":")[0],
          port: process.env.MYSQL_ADDRESS?.split(":")[1],
          username: process.env.MYSQL_USERNAME,
          database: "nodejs_demo"
        }
      });
    }

    await sequelize.authenticate();
    res.json({
      status: "connected",
      message: "数据库连接正常"
    });
  } catch (error) {
    res.json({
      status: "error",
      error: error.message,
      config: {
        host: process.env.MYSQL_ADDRESS?.split(":")[0],
        port: process.env.MYSQL_ADDRESS?.split(":")[1],
        username: process.env.MYSQL_USERNAME,
        database: "nodejs_demo"
      }
    });
  }
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  try {
    console.log("正在启动应用...");
    console.log("端口:", port);
    console.log("数据库地址:", process.env.MYSQL_ADDRESS);
    
    // 先启动服务器，再初始化数据库
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`服务器启动成功，监听端口 ${port}`);
    });

    // 异步初始化数据库，不阻塞服务器启动
    initDB().then(() => {
      console.log("数据库初始化成功");
      dbConnected = true;
    }).catch((error) => {
      console.error("数据库初始化失败:", error);
      dbConnected = false;
      // 不退出进程，让服务器继续运行
      
      // 每30秒重试一次数据库连接
      const retryInterval = setInterval(async () => {
        try {
          console.log("重试数据库连接...");
          await initDB();
          console.log("数据库重连成功");
          dbConnected = true;
          clearInterval(retryInterval);
        } catch (retryError) {
          console.error("数据库重连失败:", retryError.message);
        }
      }, 30000);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，正在关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("启动失败:", error);
    process.exit(1);
  }
}

bootstrap();
