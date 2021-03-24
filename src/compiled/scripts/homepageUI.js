var _wb_home;
(function (_wb_home) {
    function scrollToAnchor(name) {
        document.querySelector("a[name=\"" + name + "\"]").scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, null, "#" + name);
    }
    _wb_home.scrollToAnchor = scrollToAnchor;
    function privacy() {
        Swal.fire({
            icon: "info",
            width: 800,
            title: "Our Privacy Policy",
            html: "Here at Writeboard, we're committed to your privacy, which is why this privacy policy aims to be as transparent as possible.\n    All the data we collect is for the sole purpose of improving Writeboard, and we never share any data with any third parties.\n    <h2>What data do we collect?</h2>\n      <ul>\n        <li>Device information such as OS, model, input type etc</li>\n        <li>Browser information such as name, version, screen resolution etc</li>\n        <li>Country</li>\n      </ul>\n    <h2>What data don't we collect?</h2>\n    <ul>\n      <li>Any personally-identifiable data</li>\n      <li>IP addresses</li>\n    </ul>",
            confirmButtonText: "Close",
            background: "var(--background)"
        });
    }
    _wb_home.privacy = privacy;
    function updateLatestUpdates() {
        var updateList = document.querySelector("ul#updateList");
        window.fetch("https://api.github.com/repos/w-henderson/Writeboard/commits")
            .then(function (data) {
            if (data.ok)
                return data.json();
            else {
                updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
                firebase.analytics().logEvent("latestUpdatesError", { "errorType": "404" });
                return false;
            }
        })
            .then(function (data) {
            if (!data)
                return;
            updateList.innerHTML = "";
            for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                var commit = data_1[_i];
                var commitMessage = commit.commit.message;
                if (commitMessage.substr(0, 20) === "Merge pull request #")
                    continue;
                else
                    commitMessage = commitMessage.split("\n")[0];
                var commitDate = new Date(commit.commit.author.date);
                var commitDateString = commitDate.toLocaleDateString() + ": ";
                var li = document.createElement("li");
                var a = document.createElement("a");
                var date = document.createTextNode(commitDateString);
                a.href = commit.html_url;
                a.target = "_blank";
                a.rel = "noopener";
                a.textContent = commitMessage;
                li.appendChild(date);
                li.appendChild(a);
                updateList.appendChild(li);
                if (updateList.childElementCount === 5)
                    return;
            }
        })["catch"](function (e) {
            updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
            firebase.analytics().logEvent("latestUpdatesError", { errorType: "unknown" });
        });
    }
    _wb_home.updateLatestUpdates = updateLatestUpdates;
    function fixMobileScaling() {
        var hero = document.querySelector("section.hero");
        if (window.innerWidth > 1100)
            hero.style.height = window.innerHeight - 120 + "px";
        else
            hero.style.height = window.innerHeight - 220 + "px";
    }
    _wb_home.fixMobileScaling = fixMobileScaling;
})(_wb_home || (_wb_home = {}));
window.addEventListener("load", _wb_home.updateLatestUpdates);
window.addEventListener("resize", _wb_home.fixMobileScaling);
_wb_home.fixMobileScaling();
