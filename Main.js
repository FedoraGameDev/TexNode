const electron = require("electron");
const url = require("url");
const path = require("path");

const { app, BrowserWindow, Menu, ipcMain } = electron;

process.env.NODE_ENV = "development";

let mainWindow;

app.on("ready", () =>
{
    mainWindow = new BrowserWindow({});
});