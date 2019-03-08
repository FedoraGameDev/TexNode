const electron = require("electron");
const url = require("url");
const path = require("path");
const fs = require("fs");
const UserPrefs = require("./UserPrefs.js");

const { app, BrowserWindow, Menu, ipcMain } = electron;

process.env.NODE_ENV = "development";

let mainWindow;

const userPrefs = new UserPrefs({
    configName: "user-preferences",
    defaults: {
        windowBounds: { width: 800, height: 600 },
        fullScreen: "false"
    }
});

const layoutConfig = new UserPrefs({
    configName: "layout-config",
    defaults: {
        splits: {
            type: "horizontal-split",
            distance: "75",
            first: {
                type: "vertical-split",
                distance: "75",
                first: {
                    type: "window",
                    window: "Views/nodeTree.json"
                },
                second: {
                    type: "window",
                    window: "Views/imagePreview.json"
                }
            },
            second: {
                type: "window",
                window: "Views/nodeList.json"
            }
        }
    }
});

app.on("ready", () =>
{
    let { width, height } = userPrefs.get("windowBounds");
    let layout = layoutConfig.get("splits");
    mainWindow = new BrowserWindow({ width, height, show: false });

    mainWindow.on("resize", () => 
    {
        let { width, height } = mainWindow.getBounds();
        userPrefs.set("windowBounds", { width, height });
    });

    mainWindow.on("maximize", () =>
    {
        userPrefs.set("fullScreen", "true");
    });

    mainWindow.on("unmaximize", () =>
    {
        userPrefs.set("fullScreen", "false");
    });

    if (userPrefs.get("fullScreen") == "true")
        mainWindow.maximize();

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, "Main.html"),
        protocol: "file:",
        slashes: true
    }));

    mainWindow.once("ready-to-show", () =>
    {
        console.log("Window ready, generating panels.");
        GenerateWindow(layoutConfig.get("splits"), { positionx: 0, positiony: 0, width: 100, height: 100 });
        mainWindow.show();
    });
});

ipcMain.on("debug:log", (e, message) =>
{
    console.log(message);
});

//SplitData: data containing splits or windows recursively
//WindowSpace: rect with posx, posy, width, height
function GenerateWindow(splitData, windowSpace)
{
    //if splitData.type == horizontal-split || vertical-split
    //  cut down windowSpace accordingly, then call Generate Window with splitData.first and splitData.second
    const distance = parseFloat(splitData.distance);
    const distOfHeight = windowSpace.height * distance / 100;
    const distOfWidth = windowSpace.width * distance / 100;
    const inverseOfHeight = windowSpace.height - distOfHeight;
    const inverseOfWidth = windowSpace.width - distOfWidth;

    switch (splitData.type)
    {
        case "horizontal-split":
            GenerateWindow(splitData.first, { positionx: windowSpace.positionx, positiony: windowSpace.positiony, width: windowSpace.width, height: distOfHeight });
            GenerateWindow(splitData.second, { positionx: windowSpace.positionx, positiony: distOfHeight, width: windowSpace.width, height: inverseOfHeight });
            break;

        case "vertical-split":
            GenerateWindow(splitData.first, { positionx: windowSpace.positionx, positiony: windowSpace.positiony, width: distOfWidth, height: windowSpace.height });
            GenerateWindow(splitData.second, { positionx: distOfWidth, positiony: windowSpace.positiony, width: inverseOfWidth, height: windowSpace.height });
            break;

        case "window":
            console.log("windowSpace: " +
                "posx - " + windowSpace.positionx + "%" +
                ", posy - " + windowSpace.positiony + "%" +
                ", width - " + windowSpace.width + "%" +
                ", height - " + windowSpace.height + "%");

            let styles = [
                "display: block",
                "position: fixed",
                "left: " + windowSpace.positionx + "%",
                "top: " + windowSpace.positiony + "%",
                "width: " + windowSpace.width + "%",
                "height: " + windowSpace.height + "%",
                "border: 1px solid black"
            ];

            let fileContent = JSON.parse(fs.readFileSync(splitData.window));

            let elements = [
                {
                    type: "div",
                    attributes: [
                        {
                            attribute: "style",
                            value: styles.join("; ")
                        }
                    ],
                    contents: fileContent
                }
            ]
            mainWindow.webContents.send("add:box", elements);
            break;
    }
}