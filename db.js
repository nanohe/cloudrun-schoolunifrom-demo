require('dotenv').config();
const { Sequelize, DataTypes } = require("sequelize");

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "" } = process.env;

console.log("数据库配置:", {
  username: MYSQL_USERNAME,
  address: MYSQL_ADDRESS,
  hasPassword: !!MYSQL_PASSWORD
});

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql",
  logging: console.log, // 启用 SQL 日志
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/
    ],
    max: 3
  }
});

// 定义数据模型
const Counter = sequelize.define("Counter", {
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
});

// 数据库初始化方法
async function init() {
  try {
    console.log("正在测试数据库连接...");
    await sequelize.authenticate();
    console.log("数据库连接成功");
    
    console.log("正在同步数据库表...");
    await Counter.sync({ alter: true });
    console.log("数据库表同步成功");
  } catch (error) {
    console.error("数据库初始化失败:", error);
    throw error;
  }
}

// 导出初始化方法和模型
module.exports = {
  init,
  Counter,
  sequelize,
};
