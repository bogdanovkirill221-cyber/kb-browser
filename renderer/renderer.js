
const tabsContainer = document.getElementById("tabsContainer");
const newTabButton = document.getElementById("newTab");

const backButton = document.getElementById("back");
const forwardButton = document.getElementById("forward");
const reloadButton = document.getElementById("reload");
const homeButton = document.getElementById("home");
const settingsButton = document.getElementById("settings");

const addressInput = document.getElementById("address");

const homePage = document.getElementById("homePage");
const searchPage = document.getElementById("searchPage");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("search");

const resultsSearchForm = document.getElementById("resultsSearchForm");
const resultsSearchInput = document.getElementById("resultsSearch");

const resultsContainer = document.getElementById("results");

const searchTabButtons =
    document.querySelectorAll(".search-tab");


const imageViewer =
    document.getElementById("imageViewer");

const viewerImage =
    document.getElementById("viewerImage");

const closeImageViewer =
    document.getElementById("closeImageViewer");

const saveImageButton =
    document.getElementById("saveImage");

const copyImageButton =
    document.getElementById("copyImage");

const copyImageURLButton =
    document.getElementById("copyImageURL");

const openImageButton =
    document.getElementById("openImage");


const settingsOverlay =
    document.getElementById("settingsOverlay");

const closeSettingsButton =
    document.getElementById("closeSettings");

const settingsMenuButtons =
    document.querySelectorAll(
        ".settings-menu-button"
    );

const settingsSections =
    document.querySelectorAll(
        ".settings-section"
    );

const historyList =
    document.getElementById("historyList");

const clearHistoryButton =
    document.getElementById("clearHistory");

const downloadsList =
    document.getElementById("downloadsList");

const wallpaperOptions =
    document.querySelectorAll(
        ".wallpaper-option"
    );

const wallpaperFile =
    document.getElementById("wallpaperFile");


let tabs = [];

let activeTabId = null;

let currentSearchCategory = "general";

let currentImageURL = "";

let downloads = [];



function isWebsite(value) {

    return (
        value.startsWith("http://") ||
        value.startsWith("https://")
    );

}



function makeWebsiteURL(value) {

    value = value.trim();

    if (!value) {
        return "";
    }

    if (isWebsite(value)) {
        return value;
    }

    if (
        value.includes(".") &&
        !value.includes(" ")
    ) {

        return "https://" + value;

    }

    return "";

}



function showHomePage() {

    homePage.style.display = "block";

    searchPage.style.display = "none";

    addressInput.value = "";

    searchInput.value = "";

    resultsSearchInput.value = "";

    resultsContainer.innerHTML = "";

}



function showSearchPage() {

    homePage.style.display = "none";

    searchPage.style.display = "block";

}



function goHome() {

    showHomePage();

    window.kb.home();

}



async function navigateFromAddress() {

    const value =
        addressInput.value.trim();

    if (!value) {
        return;
    }


    const website =
        makeWebsiteURL(value);


    if (website) {

        await window.kb.navigate(
            website
        );

        return;

    }


    await performSearch(value);

}



async function performSearch(query) {

    query = query.trim();

    if (!query) {
        return;
    }


    showSearchPage();

    resultsSearchInput.value = query;

    resultsContainer.innerHTML =
        '<div class="search-loading">Поиск...</div>';


    try {

        const response =
            await window.kb.search(
                query,
                currentSearchCategory
            );


        const searchResults =
            response?.results || [];


        renderResults(searchResults);


    } catch (error) {

        console.error(
            "Ошибка поиска:",
            error
        );


        resultsContainer.innerHTML =
            '<div class="search-empty">Ошибка поиска</div>';

    }

}



function renderResults(items) {

    resultsContainer.innerHTML = "";


    if (
        !items ||
        items.length === 0
    ) {

        resultsContainer.innerHTML =
            '<div class="search-empty">Ничего не найдено</div>';

        return;

    }


    for (
        const item of items
    ) {

        const imageURL =
            item.thumbnail ||
            item.image ||
            item.img_src ||
            "";


        if (
            currentSearchCategory === "images" &&
            imageURL
        ) {

            renderImageResult(
                item,
                imageURL
            );

            continue;

        }


        renderTextResult(item);

    }

}



function renderTextResult(item) {

    const result =
        document.createElement("div");

    result.className =
        "search-result";


    const title =
        document.createElement("a");

    title.className =
        "result-title";

    title.textContent =
        item.title ||
        "Без названия";


    title.href =
        item.url ||
        "#";


    const url =
        document.createElement("div");

    url.className =
        "result-url";

    url.textContent =
        item.url ||
        "";


    const description =
        document.createElement("div");

    description.className =
        "result-description";

    description.textContent =
        item.description ||
        "Описание отсутствует.";


    result.appendChild(title);

    result.appendChild(url);

    result.appendChild(description);


    title.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();

            if (item.url) {

                await window.kb.navigate(
                    item.url
                );

            }

        }
    );


    resultsContainer.appendChild(
        result
    );

}



function renderImageResult(
    item,
    imageURL
) {

    const result =
        document.createElement("div");

    result.className =
        "image-result";


    const imageButton =
        document.createElement("button");

    imageButton.className =
        "image-result-button";

    imageButton.type =
        "button";


    const image =
        document.createElement("img");

    image.className =
        "image-result-preview";

    image.src =
        imageURL;

    image.alt =
        item.title ||
        "Изображение";

    image.loading =
        "lazy";


    image.addEventListener(
        "error",
        () => {

            result.remove();

        }
    );


    const info =
        document.createElement("div");

    info.className =
        "image-result-info";


    const title =
        document.createElement("div");

    title.className =
        "image-result-title";

    title.textContent =
        item.title ||
        "Изображение";


    const source =
        document.createElement("div");

    source.className =
        "image-result-source";

    source.textContent =
        item.url ||
        "";


    info.appendChild(title);

    info.appendChild(source);


    imageButton.appendChild(image);

    imageButton.appendChild(info);


    imageButton.addEventListener(
        "click",
        () => {

            openImageViewer(
                imageURL
            );

        }
    );


    result.appendChild(
        imageButton
    );


    resultsContainer.appendChild(
        result
    );

}



function openImageViewer(
    imageURL
) {

    if (!imageURL) {
        return;
    }


    currentImageURL =
        imageURL;


    viewerImage.src =
        imageURL;


    imageViewer.style.display =
        "flex";

}



function closeImageViewerWindow() {

    imageViewer.style.display =
        "none";

    viewerImage.src =
        "";

    currentImageURL =
        "";

}



async function saveCurrentImage() {

    if (!currentImageURL) {
        return;
    }


    try {

        await window.kb.saveImageAs(
            currentImageURL
        );

    } catch (error) {

        console.error(
            "Ошибка сохранения изображения:",
            error
        );

    }

}



async function copyCurrentImage() {

    if (!currentImageURL) {
        return;
    }


    try {

        await window.kb.copyImage(
            currentImageURL
        );

    } catch (error) {

        console.error(
            "Ошибка копирования изображения:",
            error
        );

    }

}



async function copyCurrentImageURL() {

    if (!currentImageURL) {
        return;
    }


    try {

        await window.kb.copyImageURL(
            currentImageURL
        );

    } catch (error) {

        console.error(
            "Ошибка копирования URL:",
            error
        );

    }

}



async function openCurrentImage() {

    if (!currentImageURL) {
        return;
    }


    closeImageViewerWindow();

    await window.kb.navigate(
        currentImageURL
    );

}



async function createNewTab() {

    await window.kb.createTab();

    showHomePage();

    await updateTabs();

}



async function closeTab(
    tabId
) {

    await window.kb.closeTab(
        tabId
    );

    await updateTabs();

}



async function switchTab(
    tabId
) {

    activeTabId =
        tabId;


    await window.kb.switchTab(
        tabId
    );


    const current =
        tabs.find(
            tab => tab.id === tabId
        );


    if (
        current &&
        current.url
    ) {

        addressInput.value =
            current.url;

    } else {

        showHomePage();

    }


    await updateTabs();

}



function getTabTitle(
    tab
) {

    if (
        tab.title &&
        tab.title.trim() !== ""
    ) {

        return tab.title;

    }


    if (
        tab.url &&
        tab.url.trim() !== ""
    ) {

        try {

            const parsed =
                new URL(tab.url);

            return parsed.hostname;

        } catch (error) {

            return "Вкладка";

        }

    }


    return "Новая вкладка";

}



function updateTabsUI() {

    tabsContainer.innerHTML = "";


    for (
        const tab of tabs
    ) {

        const tabElement =
            document.createElement("div");

        tabElement.className =
            "tab";


        if (
            tab.id === activeTabId
        ) {

            tabElement.classList.add(
                "active"
            );

        }


        const title =
            document.createElement("span");

        title.className =
            "tab-title";

        title.textContent =
            getTabTitle(tab);


        const close =
            document.createElement("button");

        close.className =
            "tab-close";

        close.textContent =
            "×";


        close.addEventListener(
            "click",
            async (event) => {

                event.stopPropagation();

                await closeTab(
                    tab.id
                );

            }
        );


        tabElement.addEventListener(
            "click",
            async () => {

                await switchTab(
                    tab.id
                );

            }
        );


        tabElement.appendChild(
            title
        );

        tabElement.appendChild(
            close
        );


        tabsContainer.appendChild(
            tabElement
        );

    }

}



async function updateTabs() {

    try {

        const data =
            await window.kb.getTabs();


        tabs =
            Array.isArray(data?.tabs)
                ? data.tabs
                : data || [];


        activeTabId =
            data?.activeTabId ??
            activeTabId;


        updateTabsUI();


    } catch (error) {

        console.error(
            "Ошибка вкладок:",
            error
        );

    }

}



function openSettings() {

    settingsOverlay.style.display =
        "flex";


    loadHistory();

    loadDownloads();

    loadWallpaper();

}



function closeSettings() {

    settingsOverlay.style.display =
        "none";

}



function switchSettingsSection(
    sectionId
) {

    settingsMenuButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.section === sectionId
            );

        }
    );


    settingsSections.forEach(
        section => {

            section.classList.toggle(
                "active",
                section.id === sectionId
            );

        }
    );


    if (
        sectionId === "historySettings"
    ) {

        loadHistory();

    }


    if (
        sectionId === "downloadsSettings"
    ) {

        loadDownloads();

    }

}



async function loadHistory() {

    try {

        const history =
            await window.kb.getHistory();


        renderHistory(
            Array.isArray(history)
                ? history
                : history?.history || []
        );


    } catch (error) {

        console.error(
            "Ошибка истории:",
            error
        );

        historyList.innerHTML =
            '<div class="history-empty">Не удалось загрузить историю</div>';

    }

}



function renderHistory(
    items
) {

    historyList.innerHTML = "";


    if (
        !items ||
        items.length === 0
    ) {

        historyList.innerHTML =
            '<div class="history-empty">История пуста</div>';

        return;

    }


    for (
        const item of items
    ) {

        const row =
            document.createElement("div");

        row.className =
            "history-item";


        const information =
            document.createElement("div");

        information.className =
            "history-information";


        const title =
            document.createElement("div");

        title.className =
            "history-title";

        title.textContent =
            item.title ||
            item.url ||
            "Страница";


        const url =
            document.createElement("div");

        url.className =
            "history-url";

        url.textContent =
            item.url ||
            "";


        const date =
            document.createElement("div");

        date.className =
            "history-date";

        date.textContent =
            formatDate(item.time);


        information.appendChild(
            title
        );

        information.appendChild(
            url
        );

        information.appendChild(
            date
        );


        const openButton =
            document.createElement("button");

        openButton.className =
            "history-open";

        openButton.textContent =
            "Открыть";


        openButton.addEventListener(
            "click",
            async () => {

                if (item.url) {

                    closeSettings();

                    await window.kb.navigate(
                        item.url
                    );

                }

            }
        );


        row.appendChild(
            information
        );

        row.appendChild(
            openButton
        );


        historyList.appendChild(
            row
        );

    }

}



function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleString(
        "ru-RU"
    );

}



async function clearBrowserHistory() {

    const confirmed =
        confirm(
            "Очистить всю историю браузера?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await window.kb.clearHistory();

        await loadHistory();

    } catch (error) {

        console.error(
            "Ошибка очистки истории:",
            error
        );

    }

}



async function loadDownloads() {

    try {

        const data =
            await window.kb.getDownloads();


        downloads =
            Array.isArray(data)
                ? data
                : data?.downloads || [];


        renderDownloads();

    } catch (error) {

        console.error(
            "Ошибка загрузок:",
            error
        );

    }

}



function renderDownloads() {

    downloadsList.innerHTML = "";


    if (
        !downloads ||
        downloads.length === 0
    ) {

        downloadsList.innerHTML =
            '<div class="downloads-empty">Загрузок пока нет</div>';

        return;

    }


    for (
        const item of downloads
    ) {

        const row =
            document.createElement("div");

        row.className =
            "download-item";


        const information =
            document.createElement("div");

        information.className =
            "download-information";


        const name =
            document.createElement("div");

        name.className =
            "download-name";

        name.textContent =
            item.filename ||
            item.name ||
            "Файл";


        const status =
            document.createElement("div");

        status.className =
            "download-status";


        if (
            item.state === "completed"
        ) {

            status.textContent =
                "Готово";

        } else if (
            item.state === "cancelled"
        ) {

            status.textContent =
                "Отменено";

        } else if (
            item.state === "interrupted"
        ) {

            status.textContent =
                "Ошибка";

        } else {

            const progress =
                Number.isFinite(
                    item.progress
                )
                    ? item.progress
                    : 0;


            status.textContent =
                `Загрузка — ${progress}%`;

        }


        information.appendChild(
            name
        );

        information.appendChild(
            status
        );


        const progressBar =
            document.createElement("div");

        progressBar.className =
            "download-progress";


        const progressValue =
            document.createElement("div");

        progressValue.className =
            "download-progress-value";


        const progress =
            Number.isFinite(
                item.progress
            )
                ? item.progress
                : 0;


        progressValue.style.width =
            `${progress}%`;


        progressBar.appendChild(
            progressValue
        );


        row.appendChild(
            information
        );

        row.appendChild(
            progressBar
        );


        downloadsList.appendChild(
            row
        );

    }

}



function applyWallpaper(
    wallpaper
) {

    document.body.dataset.wallpaper =
        wallpaper;


    localStorage.setItem(
        "kb-wallpaper",
        wallpaper
    );


    wallpaperOptions.forEach(
        option => {

            option.classList.toggle(
                "selected",
                option.dataset.wallpaper === wallpaper
            );

        }
    );

}



function loadWallpaper() {

    const saved =
        localStorage.getItem(
            "kb-wallpaper"
        ) ||
        "default";


    applyWallpaper(
        saved
    );

}



function setCustomWallpaper(
    dataURL
) {

    if (!dataURL) {
        return;
    }


    localStorage.setItem(
        "kb-custom-wallpaper",
        dataURL
    );


    localStorage.setItem(
        "kb-wallpaper",
        "custom"
    );


    document.body.dataset.wallpaper =
        "custom";


    document.body.style.setProperty(
        "--kb-custom-wallpaper",
        `url("${dataURL}")`
    );


    wallpaperOptions.forEach(
        option => {

            option.classList.remove(
                "selected"
            );

        }
    );

}



backButton.addEventListener(
    "click",
    () => {

        window.kb.back();

    }
);


forwardButton.addEventListener(
    "click",
    () => {

        window.kb.forward();

    }
);


reloadButton.addEventListener(
    "click",
    () => {

        window.kb.reload();

    }
);


homeButton.addEventListener(
    "click",
    () => {

        goHome();

    }
);


settingsButton.addEventListener(
    "click",
    () => {

        openSettings();

    }
);


newTabButton.addEventListener(
    "click",
    async () => {

        await createNewTab();

    }
);


addressInput.addEventListener(
    "keydown",
    async (event) => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            await navigateFromAddress();

        }

    }
);


searchForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        currentSearchCategory =
            "general";

        searchTabButtons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.category === "general"
                );

            }
        );


        await performSearch(
            searchInput.value
        );

    }
);


resultsSearchForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        await performSearch(
            resultsSearchInput.value
        );

    }
);


searchTabButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            async () => {

                currentSearchCategory =
                    button.dataset.category;


                searchTabButtons.forEach(
                    item => {

                        item.classList.toggle(
                            "active",
                            item === button
                        );

                    }
                );


                const query =
                    resultsSearchInput.value.trim();


                if (query) {

                    await performSearch(
                        query
                    );

                }

            }
        );

    }
);


closeImageViewer.addEventListener(
    "click",
    () => {

        closeImageViewerWindow();

    }
);


imageViewer.addEventListener(
    "click",
    (event) => {

        if (
            event.target === imageViewer
        ) {

            closeImageViewerWindow();

        }

    }
);


saveImageButton.addEventListener(
    "click",
    async () => {

        await saveCurrentImage();

    }
);


copyImageButton.addEventListener(
    "click",
    async () => {

        await copyCurrentImage();

    }
);


copyImageURLButton.addEventListener(
    "click",
    async () => {

        await copyCurrentImageURL();

    }
);


openImageButton.addEventListener(
    "click",
    async () => {

        await openCurrentImage();

    }
);


closeSettingsButton.addEventListener(
    "click",
    () => {

        closeSettings();

    }
);


settingsOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target === settingsOverlay
        ) {

            closeSettings();

        }

    }
);


settingsMenuButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                switchSettingsSection(
                    button.dataset.section
                );

            }
        );

    }
);


clearHistoryButton.addEventListener(
    "click",
    async () => {

        await clearBrowserHistory();

    }
);


wallpaperOptions.forEach(
    option => {

        option.addEventListener(
            "click",
            () => {

                applyWallpaper(
                    option.dataset.wallpaper
                );

            }
        );

    }
);


wallpaperFile.addEventListener(
    "change",
    () => {

        const file =
            wallpaperFile.files?.[0];


        if (!file) {
            return;
        }


        if (
            !file.type.startsWith("image/")
        ) {

            return;

        }


        const reader =
            new FileReader();


        reader.onload =
            () => {

                setCustomWallpaper(
                    reader.result
                );

            };


        reader.readAsDataURL(
            file
        );

    }
);


document.querySelectorAll(
    ".shortcuts button"
).forEach(
    button => {

        button.addEventListener(
            "click",
            async () => {

                const url =
                    button.dataset.url;


                if (url) {

                    await window.kb.navigate(
                        url
                    );

                }

            }

        );

    }
);


window.kb.onURLChanged(
    async (data) => {

        if (
            data &&
            data.url
        ) {

            addressInput.value =
                data.url;

        }


        await updateTabs();

    }
);


window.kb.onBrowserLoaded(
    async (data) => {

        if (
            data &&
            data.url
        ) {

            addressInput.value =
                data.url;

        }


        await updateTabs();

    }
);


window.kb.onPageTitleUpdated(
    async () => {

        await updateTabs();

    }
);


window.kb.onTabsUpdated(
    async () => {

        await updateTabs();

    }
);


window.kb.onHistoryUpdated(
    async () => {

        if (
            settingsOverlay.style.display === "flex"
        ) {

            await loadHistory();

        }

    }
);


window.kb.onDownloadStarted(
    async (data) => {

        downloads.push(data);

        renderDownloads();

    }
);


window.kb.onDownloadProgress(
    (data) => {

        const index =
            downloads.findIndex(
                item =>
                    item.id === data.id
            );


        if (index !== -1) {

            downloads[index] = {
                ...downloads[index],
                ...data
            };

        } else {

            downloads.push(data);

        }


        renderDownloads();

    }
);


window.kb.onDownloadDone(
    async (data) => {

        const index =
            downloads.findIndex(
                item =>
                    item.id === data.id
            );


        if (index !== -1) {

            downloads[index] = {
                ...downloads[index],
                ...data
            };

        } else {

            downloads.push(data);

        }


        renderDownloads();

    }
);


window.kb.onDownloadsUpdated(
    (data) => {

        downloads =
            Array.isArray(data)
                ? data
                : data?.downloads || [];


        renderDownloads();

    }
);


async function initializeTabs() {

    try {

        const data =
            await window.kb.getTabs();


        if (
            !data ||
            !Array.isArray(
                data.tabs
            ) ||
            data.tabs.length === 0
        ) {

            await window.kb.createTab();

        } else {

            tabs =
                data.tabs;

            activeTabId =
                data.activeTabId;

        }


        loadWallpaper();

        showHomePage();

        await updateTabs();


    } catch (error) {

        console.error(
            "Ошибка запуска вкладок:",
            error
        );

    }

}



initializeTabs();
