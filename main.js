const {
    app,
    BrowserWindow,
    WebContentsView,
    ipcMain,
    session,
    dialog,
    clipboard,
    nativeImage
} = require("electron");

const path = require("path");
const fs = require("fs");

let mainWindow = null;
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let workingSearchServers = [];
let downloads = [];
let browserHistory = [];

const historyFile = path.join(
    app.getPath("userData"),
    "history.json"
);

// ========================================
// ИСТОРИЯ ПОСЕЩЕНИЙ
// ========================================

function loadHistory() {
    try {
        if (fs.existsSync(historyFile)) {
            const data = fs.readFileSync(
                historyFile,
                "utf8"
            );

            const parsed = JSON.parse(data);

            if (Array.isArray(parsed)) {
                browserHistory = parsed;
            }
        }
    } catch (error) {
        console.error(
            "Ошибка загрузки истории:",
            error
        );

        browserHistory = [];
    }
}

function saveHistory() {
    try {
        const folder = path.dirname(historyFile);

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {
                recursive: true
            });
        }

        fs.writeFileSync(
            historyFile,
            JSON.stringify(
                browserHistory,
                null,
                2
            ),
            "utf8"
        );
    } catch (error) {
        console.error(
            "Ошибка сохранения истории:",
            error
        );
    }
}

function addHistory(url, title = "") {
    if (!url) {
        return;
    }

    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {
        return;
    }

    const item = {
        id:
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2),

        url,

        title: title || url,

        time: new Date().toISOString()
    };

    browserHistory = browserHistory.filter(
        entry => entry.url !== url
    );

    browserHistory.unshift(item);

    browserHistory = browserHistory.slice(
        0,
        1000
    );

    saveHistory();

    sendToRenderer(
        "history-updated",
        browserHistory
    );
}

// ========================================
// ОКНО
// ========================================

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: "#101016",

        webPreferences: {
            preload: path.join(
                __dirname,
                "preload.js"
            ),

            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile(
        path.join(
            __dirname,
            "renderer",
            "index.html"
        )
    );

    mainWindow.on(
        "resize",
        () => {
            updateActiveTabBounds();
        }
    );

    mainWindow.on(
        "closed",
        () => {
            tabs = [];
            activeTabId = null;
            mainWindow = null;
        }
    );

    setTimeout(
        () => {
            if (mainWindow) {
                const tab = createTab();

                if (tab) {
                    showTab(tab);
                }

                sendTabsUpdate();
            }
        },
        300
    );
}

// ========================================
// РАЗМЕР WEB VIEW
// ========================================

function getContentBounds() {
    if (!mainWindow) {
        return {
            x: 0,
            y: 100,
            width: 0,
            height: 0
        };
    }

    const bounds =
        mainWindow.getContentBounds();

    return {
        x: 0,
        y: 100,
        width: bounds.width,
        height: Math.max(
            0,
            bounds.height - 100
        )
    };
}

function updateTabBounds(tab) {
    if (!tab || !mainWindow) {
        return;
    }

    try {
        tab.view.setBounds(
            getContentBounds()
        );
    } catch (error) {
        console.error(
            "Ошибка изменения размера вкладки:",
            error
        );
    }
}

function updateActiveTabBounds() {
    const tab = getActiveTab();

    if (tab) {
        updateTabBounds(tab);
    }
}

// ========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================================

function getActiveTab() {
    return tabs.find(
        tab => tab.id === activeTabId
    );
}

function sendToRenderer(channel, data) {
    if (
        mainWindow &&
        !mainWindow.isDestroyed()
    ) {
        mainWindow.webContents.send(
            channel,
            data
        );
    }
}

// ========================================
// ИСТОРИЯ НАВИГАЦИИ KB
// ========================================

function createNavigationHistory(tab) {
    tab.navigationHistory = [
        {
            type: "home",
            url: ""
        }
    ];

    tab.navigationIndex = 0;
}

function getNavigationState(tab) {
    if (!tab) {
        return {
            canGoBack: false,
            canGoForward: false
        };
    }

    let canGoBack = false;
    let canGoForward = false;

    if (
        tab.view &&
        !tab.view.webContents.isDestroyed()
    ) {
        try {
            canGoBack =
                tab.view.webContents.canGoBack();

            canGoForward =
                tab.view.webContents.canGoForward();
        } catch {
            canGoBack = false;
            canGoForward = false;
        }
    }

    if (
        !canGoBack &&
        tab.navigationIndex > 0
    ) {
        canGoBack = true;
    }

    if (
        tab.navigationIndex <
        tab.navigationHistory.length - 1
    ) {
        canGoForward = true;
    }

    return {
        canGoBack,
        canGoForward
    };
}

function sendNavigationState(tab) {
    if (!tab) {
        return;
    }

    const state =
        getNavigationState(tab);

    sendToRenderer(
        "navigation-state",
        {
            tabId: tab.id,
            canGoBack: state.canGoBack,
            canGoForward: state.canGoForward
        }
    );
}

function addNavigationEntry(tab, entry) {
    if (!tab) {
        return;
    }

    const current =
        tab.navigationHistory[
            tab.navigationIndex
        ];

    if (
        current &&
        current.type === entry.type &&
        current.url === entry.url
    ) {
        sendNavigationState(tab);
        return;
    }

    if (
        tab.navigationIndex <
        tab.navigationHistory.length - 1
    ) {
        tab.navigationHistory =
            tab.navigationHistory.slice(
                0,
                tab.navigationIndex + 1
            );
    }

    tab.navigationHistory.push(entry);

    tab.navigationIndex =
        tab.navigationHistory.length - 1;

    sendNavigationState(tab);
}

// ========================================
// ПОДКЛЮЧЕНИЕ / ОТКЛЮЧЕНИЕ ВКЛАДОК
// ========================================

function attachTab(tab) {
    if (!mainWindow || !tab) {
        return;
    }

    if (!tab.attached) {
        mainWindow.contentView.addChildView(
            tab.view
        );

        tab.attached = true;
    }

    updateTabBounds(tab);
}

function detachTab(tab) {
    if (!mainWindow || !tab) {
        return;
    }

    if (tab.attached) {
        try {
            mainWindow.contentView.removeChildView(
                tab.view
            );
        } catch (error) {
            console.error(
                "Ошибка удаления вкладки:",
                error
            );
        }

        tab.attached = false;
    }
}

function hideAllTabs() {
    for (const tab of tabs) {
        try {
            tab.view.setVisible(false);
        } catch (error) {
            console.error(error);
        }
    }
}

function showTab(tab) {
    if (!tab) {
        return;
    }

    hideAllTabs();

    if (tab.url) {
        attachTab(tab);

        tab.view.setVisible(true);
    }

    sendNavigationState(tab);
}

// ========================================
// СОЗДАНИЕ ВКЛАДКИ
// ========================================

function createTab() {
    if (!mainWindow) {
        return null;
    }

    const tabId = nextTabId++;

    const view = new WebContentsView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    const tab = {
        id: tabId,
        view,
        url: "",
        attached: false,
        isNavigatingFromHistory: false,
        isGoingBack: false,
        isGoingForward: false
    };

    createNavigationHistory(tab);

    tabs.push(tab);

    activeTabId = tabId;

    view.setVisible(false);

    // ------------------------------------
    // НАЧАЛО ЗАГРУЗКИ
    // ------------------------------------

    view.webContents.on(
        "did-start-loading",
        () => {
            sendToRenderer(
                "browser-loading",
                {
                    tabId: tab.id
                }
            );
        }
    );

    // ------------------------------------
    // КОНЕЦ ЗАГРУЗКИ
    // ------------------------------------

    view.webContents.on(
        "did-stop-loading",
        () => {
            sendToRenderer(
                "browser-loaded",
                {
                    tabId: tab.id,
                    url: tab.url
                }
            );

            sendNavigationState(tab);
        }
    );

    // ------------------------------------
    // СТРАНИЦА ЗАГРУЖЕНА
    // ------------------------------------

    view.webContents.on(
        "did-finish-load",
        () => {
            const currentURL =
                view.webContents.getURL();

            if (currentURL) {
                tab.url = currentURL;
            }

            let title = "";

            try {
                title =
                    view.webContents.getTitle();
            } catch {
                title = currentURL;
            }

            if (
                currentURL &&
                (
                    currentURL.startsWith(
                        "http://"
                    ) ||
                    currentURL.startsWith(
                        "https://"
                    )
                )
            ) {
                addHistory(
                    currentURL,
                    title
                );
            }

            if (
                tab.id === activeTabId
            ) {
                sendToRenderer(
                    "url-changed",
                    {
                        tabId: tab.id,
                        url: currentURL
                    }
                );
            }

            sendToRenderer(
                "browser-loaded",
                {
                    tabId: tab.id,
                    url: currentURL
                }
            );

            sendTabsUpdate();

            sendNavigationState(tab);
        }
    );

    // ------------------------------------
    // ЗАГОЛОВОК СТРАНИЦЫ
    // ------------------------------------

    view.webContents.on(
        "page-title-updated",
        (
            event,
            title
        ) => {
            sendToRenderer(
                "page-title-updated",
                {
                    tabId: tab.id,
                    title
                }
            );
        }
    );

    // ------------------------------------
    // ПЕРЕХОД НА НОВЫЙ URL
    // ------------------------------------

    view.webContents.on(
        "did-navigate",
        (
            event,
            url
        ) => {
            tab.url = url;

            if (
                tab.id === activeTabId
            ) {
                sendToRenderer(
                    "url-changed",
                    {
                        tabId: tab.id,
                        url
                    }
                );
            }

            tab.isNavigatingFromHistory =
                false;

            sendTabsUpdate();

            sendNavigationState(tab);
        }
    );

    // ------------------------------------
    // ВНУТРЕННИЙ ПЕРЕХОД СТРАНИЦЫ
    // ------------------------------------

    view.webContents.on(
        "did-navigate-in-page",
        (
            event,
            url
        ) => {
            tab.url = url;

            if (
                tab.id === activeTabId
            ) {
                sendToRenderer(
                    "url-changed",
                    {
                        tabId: tab.id,
                        url
                    }
                );
            }

            sendTabsUpdate();

            sendNavigationState(tab);
        }
    );

    // ------------------------------------
    // ОШИБКА ЗАГРУЗКИ
    // ------------------------------------

    view.webContents.on(
        "did-fail-load",
        (
            event,
            errorCode,
            errorDescription,
            validatedURL,
            isMainFrame
        ) => {
            if (!isMainFrame) {
                return;
            }

            sendToRenderer(
                "browser-error",
                {
                    tabId: tab.id,
                    errorCode,
                    errorDescription,
                    url: validatedURL
                }
            );
        }
    );

    // ------------------------------------
    // CRASH
    // ------------------------------------

    view.webContents.on(
        "render-process-gone",
        (
            event,
            details
        ) => {
            sendToRenderer(
                "browser-error",
                {
                    tabId: tab.id,
                    errorCode: -1,
                    errorDescription:
                        "Страница завершила работу.",
                    reason: details.reason
                }
            );
        }
    );

    return tab;
}

// ========================================
// ОБНОВЛЕНИЕ ВКЛАДОК
// ========================================

function sendTabsUpdate() {
    if (!mainWindow) {
        return;
    }

    mainWindow.webContents.send(
        "tabs-updated",
        {
            tabs: tabs.map(
                tab => ({
                    id: tab.id,
                    url: tab.url
                })
            ),

            activeTabId
        }
    );
}

// ========================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДКИ
// ========================================

function switchTab(tabId) {
    const tab =
        tabs.find(
            item => item.id === tabId
        );

    if (!tab) {
        return false;
    }

    activeTabId = tabId;

    showTab(tab);

    sendToRenderer(
        "url-changed",
        {
            tabId: tab.id,
            url: tab.url
        }
    );

    sendTabsUpdate();

    sendNavigationState(tab);

    return true;
}

// ========================================
// ЗАКРЫТИЕ ВКЛАДКИ
// ========================================

function closeTab(tabId) {
    const index =
        tabs.findIndex(
            tab => tab.id === tabId
        );

    if (index === -1) {
        return false;
    }

    const tab = tabs[index];

    detachTab(tab);

    try {
        tab.view.webContents.close();
    } catch (error) {
        console.error(
            "Ошибка закрытия вкладки:",
            error
        );
    }

    tabs.splice(index, 1);

    if (tabs.length === 0) {
        const newTab = createTab();

        if (newTab) {
            showTab(newTab);
        }

        sendTabsUpdate();

        return true;
    }

    if (activeTabId === tabId) {
        const newIndex =
            Math.max(
                0,
                index - 1
            );

        activeTabId =
            tabs[newIndex].id;
    }

    const activeTab =
        getActiveTab();

    showTab(activeTab);

    sendToRenderer(
        "url-changed",
        {
            tabId: activeTab.id,
            url: activeTab.url
        }
    );

    sendTabsUpdate();

    sendNavigationState(activeTab);

    return true;
}

// ========================================
// ПЕРЕХОД НА САЙТ
// ========================================

function navigate(
    url,
    fromHistory = false
) {
    const tab = getActiveTab();

    if (!tab) {
        return false;
    }

    if (!url) {
        return false;
    }

    url = String(url).trim();

    if (!url) {
        return false;
    }

    attachTab(tab);

    showTab(tab);

    tab.url = url;

    if (!fromHistory) {
        addNavigationEntry(
            tab,
            {
                type: "web",
                url
            }
        );
    }

    tab.isNavigatingFromHistory =
        fromHistory;

    sendTabsUpdate();

    sendNavigationState(tab);

    tab.view.webContents
        .loadURL(url)
        .catch(
            error => {
                console.error(
                    "Ошибка перехода:",
                    error
                );
            }
        );

    return true;
}

// ========================================
// ДОМОЙ
// ========================================

function goHome(
    fromHistory = false
) {
    const tab = getActiveTab();

    if (!tab) {
        return false;
    }

    if (
        !fromHistory &&
        tab.url !== ""
    ) {
        addNavigationEntry(
            tab,
            {
                type: "home",
                url: ""
            }
        );
    }

    tab.url = "";

    tab.isNavigatingFromHistory =
        false;

    detachTab(tab);

    sendToRenderer(
        "url-changed",
        {
            tabId: tab.id,
            url: ""
        }
    );

    sendTabsUpdate();

    sendNavigationState(tab);

    return true;
}

// ========================================
// НАЗАД
// ========================================

function goBack() {
    const tab = getActiveTab();

    if (!tab) {
        return false;
    }

    const webContents =
        tab.view.webContents;

    if (webContents.isDestroyed()) {
        return false;
    }

    const currentEntry =
        tab.navigationHistory[
            tab.navigationIndex
        ];

    // Если мы ровно на странице,
    // которую открыли через KB Browser,
    // сначала используем историю KB.
    //
    // Главная → YouTube → GitHub
    //
    // GitHub → Назад → YouTube
    //
    // YouTube → Назад → Главная

    if (
        tab.navigationIndex > 0 &&
        currentEntry &&
        currentEntry.type === "web" &&
        tab.url === currentEntry.url
    ) {
        tab.navigationIndex--;

        const entry =
            tab.navigationHistory[
                tab.navigationIndex
            ];

        if (entry.type === "home") {
            goHome(true);
            return true;
        }

        if (entry.type === "web") {
            navigate(
                entry.url,
                true
            );

            return true;
        }
    }

    // Если пользователь ходил
    // внутри самого сайта,
    // используем историю сайта.

    if (
        tab.url &&
        webContents.canGoBack()
    ) {
        webContents.goBack();
        return true;
    }

    // Запасной вариант:
    // история KB.

    if (
        tab.navigationIndex <= 0
    ) {
        return false;
    }

    tab.navigationIndex--;

    const entry =
        tab.navigationHistory[
            tab.navigationIndex
        ];

    if (entry.type === "home") {
        goHome(true);
        return true;
    }

    if (entry.type === "web") {
        navigate(
            entry.url,
            true
        );

        return true;
    }

    return false;
}

// ========================================
// ВПЕРЁД
// ========================================

function goForward() {
    const tab = getActiveTab();

    if (!tab) {
        return false;
    }

    const webContents =
        tab.view.webContents;

    if (webContents.isDestroyed()) {
        return false;
    }

    const currentEntry =
        tab.navigationHistory[
            tab.navigationIndex
        ];

    // Если мы на текущей странице KB,
    // сначала идём вперёд по истории KB.

    if (
        currentEntry &&
        currentEntry.type === "web" &&
        tab.url === currentEntry.url &&
        tab.navigationIndex <
            tab.navigationHistory.length - 1
    ) {
        tab.navigationIndex++;

        const entry =
            tab.navigationHistory[
                tab.navigationIndex
            ];

        if (entry.type === "home") {
            goHome(true);
            return true;
        }

        if (entry.type === "web") {
            navigate(
                entry.url,
                true
            );

            return true;
        }
    }

    // Если внутри сайта есть
    // собственная история вперёд.

    if (
        tab.url &&
        webContents.canGoForward()
    ) {
        webContents.goForward();
        return true;
    }

    // Запасной вариант:
    // история KB.

    if (
        tab.navigationIndex >=
        tab.navigationHistory.length - 1
    ) {
        return false;
    }

    tab.navigationIndex++;

    const entry =
        tab.navigationHistory[
            tab.navigationIndex
        ];

    if (entry.type === "home") {
        goHome(true);
        return true;
    }

    if (entry.type === "web") {
        navigate(
            entry.url,
            true
        );

        return true;
    }

    return false;
}

// ========================================
// ОБНОВИТЬ
// ========================================

function reloadPage() {
    const tab = getActiveTab();

    if (!tab) {
        return false;
    }

    const webContents =
        tab.view.webContents;

    if (webContents.isDestroyed()) {
        return false;
    }

    if (!tab.url) {
        return false;
    }

    webContents.reload();

    return true;
}

// ========================================
// ТЕКУЩИЙ URL
// ========================================

function getCurrentURL() {
    const tab = getActiveTab();

    if (!tab) {
        return "";
    }

    if (!tab.url) {
        return "";
    }

    try {
        return tab.view.webContents.getURL();
    } catch {
        return tab.url || "";
    }
}

// ========================================
// ПОИСК SEARXNG
// ========================================

async function searchOnServer(
    server,
    query,
    category = "general"
) {
    const cleanServer =
        server.replace(
            /\/+$/,
            ""
        );

    const url =
        cleanServer +
        "/search?q=" +
        encodeURIComponent(query) +
        "&format=json" +
        "&language=all" +
        "&categories=" +
        encodeURIComponent(category);

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            7000
        );

    try {
        const response =
            await fetch(
                url,
                {
                    signal:
                        controller.signal
                }
            );

        if (!response.ok) {
            throw new Error(
                "HTTP " +
                response.status
            );
        }

        const data =
            await response.json();

        const results =
            Array.isArray(data.results)
                ? data.results
                : [];

        return results.map(
            item => ({
                title:
                    item.title ||
                    "Без названия",

                url:
                    item.url ||
                    "",

                description:
                    item.content ||
                    "",

                thumbnail:
                    item.thumbnail ||
                    item.img_src ||
                    item.image ||
                    null,

                image:
                    item.img_src ||
                    item.thumbnail ||
                    item.image ||
                    null
            })
        );
    } finally {
        clearTimeout(timeout);
    }
}

// ========================================
// ПОЛУЧЕНИЕ СЕРВЕРОВ SEARXNG
// ========================================

async function getSearchServers() {
    const instancesURL =
        "https://searx.space/data/instances.json";

    try {
        const response =
            await fetch(
                instancesURL
            );

        if (!response.ok) {
            return [];
        }

        const data =
            await response.json();

        const servers = [];

        if (
            data &&
            data.instances
        ) {
            for (
                const server of
                Object.keys(
                    data.instances
                )
            ) {
                if (
                    server.startsWith(
                        "https://"
                    )
                ) {
                    servers.push(
                        server.replace(
                            /\/+$/,
                            ""
                        )
                    );
                }
            }
        }

        return servers;
    } catch (error) {
        console.error(
            "Ошибка получения SearXNG:",
            error
        );

        return [];
    }
}

// ========================================
// ПОИСК
// ========================================

async function performSearch(
    query,
    category = "general"
) {
    query =
        String(query || "").trim();

    if (!query) {
        return [];
    }

    const tried = new Set();
    const servers = [];

    for (
        const server of
        workingSearchServers
    ) {
        if (!tried.has(server)) {
            tried.add(server);
            servers.push(server);
        }
    }

    for (
        const server of
        await getSearchServers()
    ) {
        if (!tried.has(server)) {
            tried.add(server);
            servers.push(server);
        }
    }

    for (
        const server of
        servers
    ) {
        try {
            const results =
                await searchOnServer(
                    server,
                    query,
                    category
                );

            if (
                results.length > 0
            ) {
                workingSearchServers =
                    [
                        server,
                        ...workingSearchServers.filter(
                            item =>
                                item !== server
                        )
                    ].slice(
                        0,
                        3
                    );

                return results;
            }
        } catch (error) {
            console.error(
                "Ошибка поиска:",
                server,
                error.message
            );
        }
    }

    return [];
}

// ========================================
// СОХРАНЕНИЕ ИЗОБРАЖЕНИЯ
// ========================================

async function saveImageAs(imageURL) {
    if (!imageURL) {
        return false;
    }

    try {
        const result =
            await dialog.showSaveDialog(
                mainWindow,
                {
                    title:
                        "Сохранить изображение",

                    defaultPath:
                        "image.jpg",

                    filters: [
                        {
                            name:
                                "Изображения",

                            extensions: [
                                "jpg",
                                "jpeg",
                                "png",
                                "webp"
                            ]
                        },

                        {
                            name:
                                "Все файлы",

                            extensions: [
                                "*"
                            ]
                        }
                    ]
                }
            );

        if (
            result.canceled ||
            !result.filePath
        ) {
            return false;
        }

        const response =
            await fetch(
                imageURL
            );

        if (!response.ok) {
            throw new Error(
                "HTTP " +
                response.status
            );
        }

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        fs.writeFileSync(
            result.filePath,
            buffer
        );

        return true;
    } catch (error) {
        console.error(
            "Ошибка сохранения изображения:",
            error
        );

        return false;
    }
}

// ========================================
// IPC — ВКЛАДКИ
// ========================================

ipcMain.handle(
    "create-tab",
    () => {
        const tab = createTab();

        if (tab) {
            showTab(tab);
        }

        sendTabsUpdate();

        return {
            id: tab?.id || null
        };
    }
);

ipcMain.handle(
    "switch-tab",
    (
        event,
        tabId
    ) => {
        return switchTab(
            Number(tabId)
        );
    }
);

ipcMain.handle(
    "close-tab",
    (
        event,
        tabId
    ) => {
        return closeTab(
            Number(tabId)
        );
    }
);

ipcMain.handle(
    "get-tabs",
    () => {
        return {
            tabs:
                tabs.map(
                    tab => ({
                        id: tab.id,
                        url: tab.url
                    })
                ),

            activeTabId
        };
    }
);

// ========================================
// IPC — НАВИГАЦИЯ
// ========================================

ipcMain.handle(
    "navigate",
    (
        event,
        url
    ) => {
        return navigate(
            String(url || "")
        );
    }
);

ipcMain.handle(
    "show-home",
    () => {
        return goHome();
    }
);

ipcMain.handle(
    "go-back",
    () => {
        return goBack();
    }
);

ipcMain.handle(
    "go-forward",
    () => {
        return goForward();
    }
);

ipcMain.handle(
    "reload",
    () => {
        return reloadPage();
    }
);

ipcMain.handle(
    "get-url",
    () => {
        return getCurrentURL();
    }
);

// ========================================
// IPC — ПОИСК
// ========================================

ipcMain.handle(
    "search",
    (
        event,
        query,
        category
    ) => {
        return performSearch(
            query,
            category || "general"
        ).then(
            results => ({
                results
            })
        );
    }
);

// ========================================
// IPC — ИСТОРИЯ
// ========================================

ipcMain.handle(
    "get-history",
    () => {
        return browserHistory;
    }
);

ipcMain.handle(
    "clear-history",
    () => {
        browserHistory = [];

        saveHistory();

        sendToRenderer(
            "history-updated",
            browserHistory
        );

        return true;
    }
);

// ========================================
// IPC — ЗАГРУЗКИ
// ========================================

ipcMain.handle(
    "get-downloads",
    () => {
        return downloads;
    }
);

// ========================================
// IPC — ИЗОБРАЖЕНИЯ
// ========================================

ipcMain.handle(
    "save-image-as",
    (
        event,
        imageURL
    ) => {
        return saveImageAs(
            imageURL
        );
    }
);

ipcMain.handle(
    "copy-image-url",
    (
        event,
        imageURL
    ) => {
        if (!imageURL) {
            return false;
        }

        clipboard.writeText(
            imageURL
        );

        return true;
    }
);

ipcMain.handle(
    "copy-image",
    async (
        event,
        imageURL
    ) => {
        if (!imageURL) {
            return false;
        }

        try {
            const response =
                await fetch(
                    imageURL
                );

            if (!response.ok) {
                return false;
            }

            const buffer =
                Buffer.from(
                    await response.arrayBuffer()
                );

            const image =
                nativeImage.createFromBuffer(
                    buffer
                );

            if (
                image.isEmpty()
            ) {
                return false;
            }

            clipboard.writeImage(
                image
            );

            return true;
        } catch (error) {
            console.error(
                "Ошибка копирования:",
                error
            );

            return false;
        }
    }
);

// ========================================
// ЗАГРУЗКИ
// ========================================

function setupDownloads() {
    const ses =
        session.defaultSession;

    ses.on(
        "will-download",
        (
            event,
            item,
            webContents
        ) => {
            const id =
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2);

            const filename =
                item.getFilename();

            const download = {
                id,
                filename,
                receivedBytes: 0,
                totalBytes:
                    item.getTotalBytes(),
                state:
                    "progressing",
                percent: 0
            };

            downloads.push(download);

            sendToRenderer(
                "download-started",
                download
            );

            item.on(
                "updated",
                (
                    event,
                    state
                ) => {
                    download.receivedBytes =
                        item.getReceivedBytes();

                    download.totalBytes =
                        item.getTotalBytes();

                    if (
                        download.totalBytes >
                        0
                    ) {
                        download.percent =
                            Math.round(
                                (
                                    download.receivedBytes /
                                    download.totalBytes
                                ) *
                                100
                            );
                    }

                    download.state =
                        state;

                    sendToRenderer(
                        "download-progress",
                        {
                            ...download
                        }
                    );
                }
            );

            item.once(
                "done",
                (
                    event,
                    state
                ) => {
                    download.state =
                        state;

                    download.receivedBytes =
                        item.getReceivedBytes();

                    download.totalBytes =
                        item.getTotalBytes();

                    if (
                        state ===
                        "completed"
                    ) {
                        download.percent =
                            100;
                    }

                    sendToRenderer(
                        "download-done",
                        {
                            ...download
                        }
                    );

                    setTimeout(
                        () => {
                            downloads =
                                downloads.filter(
                                    item =>
                                        item.id !==
                                        id
                                );

                            sendToRenderer(
                                "downloads-updated",
                                downloads
                            );
                        },
                        5000
                    );
                }
            );
        }
    );
}

// ========================================
// ЗАПУСК
// ========================================

app.whenReady().then(
    () => {
        loadHistory();

        setupDownloads();

        createMainWindow();

        app.on(
            "activate",
            () => {
                if (
                    BrowserWindow
                        .getAllWindows()
                        .length === 0
                ) {
                    createMainWindow();
                }
            }
        );
    }
);

// ========================================
// ЗАКРЫТИЕ ПРИЛОЖЕНИЯ
// ========================================

app.on(
    "window-all-closed",
    () => {
        if (
            process.platform !==
            "darwin"
        ) {
            app.quit();
        }
    }
);