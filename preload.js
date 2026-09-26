
const {
    contextBridge,
    ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
    "kb",
    {

        navigate: (url) => {

            return ipcRenderer.invoke(
                "navigate",
                url
            );

        },


        home: () => {

            return ipcRenderer.invoke(
                "show-home"
            );

        },


        back: () => {

            return ipcRenderer.invoke(
                "go-back"
            );

        },


        forward: () => {

            return ipcRenderer.invoke(
                "go-forward"
            );

        },


        reload: () => {

            return ipcRenderer.invoke(
                "reload"
            );

        },


        getURL: () => {

            return ipcRenderer.invoke(
                "get-url"
            );

        },


        createTab: () => {

            return ipcRenderer.invoke(
                "create-tab"
            );

        },


        switchTab: (tabId) => {

            return ipcRenderer.invoke(
                "switch-tab",
                tabId
            );

        },


        closeTab: (tabId) => {

            return ipcRenderer.invoke(
                "close-tab",
                tabId
            );

        },


        getTabs: () => {

            return ipcRenderer.invoke(
                "get-tabs"
            );

        },


        search: (
            query,
            category = "general"
        ) => {

            return ipcRenderer.invoke(
                "search",
                query,
                category
            );

        },


        getHistory: () => {

            return ipcRenderer.invoke(
                "get-history"
            );

        },


        clearHistory: () => {

            return ipcRenderer.invoke(
                "clear-history"
            );

        },


        getDownloads: () => {

            return ipcRenderer.invoke(
                "get-downloads"
            );

        },


        saveImageAs: (
            imageURL
        ) => {

            return ipcRenderer.invoke(
                "save-image-as",
                imageURL
            );

        },


        copyImageURL: (
            imageURL
        ) => {

            return ipcRenderer.invoke(
                "copy-image-url",
                imageURL
            );

        },


        copyImage: (
            imageURL
        ) => {

            return ipcRenderer.invoke(
                "copy-image",
                imageURL
            );

        },


        onURLChanged: (
            callback
        ) => {

            ipcRenderer.on(
                "url-changed",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onBrowserLoaded: (
            callback
        ) => {

            ipcRenderer.on(
                "browser-loaded",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onBrowserError: (
            callback
        ) => {

            ipcRenderer.on(
                "browser-error",
                (
                    event,
                    error
                ) => {

                    callback(error);

                }
            );

        },


        onTabsUpdated: (
            callback
        ) => {

            ipcRenderer.on(
                "tabs-updated",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onPageTitleUpdated: (
            callback
        ) => {

            ipcRenderer.on(
                "page-title-updated",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onHistoryUpdated: (
            callback
        ) => {

            ipcRenderer.on(
                "history-updated",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onDownloadStarted: (
            callback
        ) => {

            ipcRenderer.on(
                "download-started",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onDownloadProgress: (
            callback
        ) => {

            ipcRenderer.on(
                "download-progress",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onDownloadDone: (
            callback
        ) => {

            ipcRenderer.on(
                "download-done",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        },


        onDownloadsUpdated: (
            callback
        ) => {

            ipcRenderer.on(
                "downloads-updated",
                (
                    event,
                    data
                ) => {

                    callback(data);

                }
            );

        }

    }
);
