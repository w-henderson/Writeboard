var Swal;
var firebase;
var _wb_host = {};
function initHost() {
    _wb_host.HOST = new Host();
    _wb_host.CHAT = new HostChat(_wb_host.HOST);
    _wb_host.UI = new HostUI();
}
window.onload = initHost;
var Host = (function () {
    function Host() {
        var _this = this;
        this.database = firebase.database();
        this.analytics = firebase.analytics();
        this.roomId = window.localStorage.getItem("writeboardTempId");
        this.userCache = {};
        this.allowedNotifications = false;
        if (!this.roomId) {
            Swal.fire({
                title: "Error 404",
                text: "Writeboard Not Found",
                icon: "error",
                background: "var(--background)"
            }).then(function () {
                _this.analytics.logEvent("failHost", {});
                window.location.href = "/";
            });
        }
        else {
            this.ref = this.database.ref("rooms/" + this.roomId + "/users");
            this.titleRef = this.database.ref("rooms/" + this.roomId + "/name");
            this.titleRef.once("value", function (e) { _wb_host.HOST.updateTitle(e); });
            this.ref.on("child_added", function (e) { _wb_host.HOST.addWhiteboard(e); });
            this.ref.on("child_changed", function (e) { _wb_host.HOST.updateWhiteboard(e); });
            this.ref.on("child_removed", function (e) { _wb_host.HOST.removeWhiteboard(e); });
            Notification.requestPermission().then(function (result) {
                _this.allowedNotifications = result === "granted";
            });
            window.localStorage.removeItem("writeboardTempId");
        }
        document.querySelector("input#messageInput").onkeyup = function (e) { _wb_host.CHAT.sendMessage(e); };
        window.addEventListener("beforeunload", function () {
            _wb_host.HOST.analytics.logEvent("closeRoom", { roomId: _wb_host.HOST.roomId });
            return _wb_host.HOST.database.ref("rooms/" + _wb_host.HOST.roomId).remove().then(function () { return; });
        });
    }
    Host.prototype.updateTitle = function (e) {
        var data = e.val();
        document.title = data + " - Writeboard";
        document.querySelector("h1").textContent = data + " (" + this.roomId + ")";
        this.analytics.logEvent("host", { roomId: this.roomId, title: data });
    };
    Host.prototype.addWhiteboard = function (e) {
        var whiteboards = document.querySelector("div.whiteboards");
        if (whiteboards.textContent.trim() === "Waiting for people to connect...")
            whiteboards.innerHTML = "";
        var userNode = document.createElement("div");
        var userWhiteboard = document.createElement("img");
        var userName = document.createElement("span");
        var messageIndicator = document.createElement("div");
        userWhiteboard.src = e.val().board;
        userWhiteboard.onclick = function (e) { _wb_host.CHAT.clickHandler(e); };
        userName.textContent = e.val().name;
        userNode.id = e.key;
        messageIndicator.style.display = "none";
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        userNode.appendChild(messageIndicator);
        whiteboards.appendChild(userNode);
        this.userCache[e.key] = {
            data: e.val(),
            seenMessages: 0
        };
    };
    Host.prototype.updateWhiteboard = function (e) {
        var _a;
        var data = e.val();
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.querySelector("img").src = data.board;
        userNode.querySelector("span").firstChild.textContent = data.name;
        this.userCache[e.key].data = e.val();
        var messageKeys = Object.keys((_a = this.userCache[e.key].data.messages) !== null && _a !== void 0 ? _a : {});
        if (e.key === this.maximisedUser)
            _wb_host.CHAT.updateMaximised();
        else if (this.allowedNotifications && data.messages && messageKeys.length > this.userCache[e.key].seenMessages && document.hidden) {
            new Notification("New Writeboard Message from " + data.name, {
                body: data.messages[messageKeys[messageKeys.length - 1]].content,
                image: data.board
            });
        }
        if (this.userCache[e.key].data.messages && messageKeys.length > this.userCache[e.key].seenMessages) {
            userNode.querySelector("div").style.display = "block";
            userNode.querySelector("div").textContent = (messageKeys.length - this.userCache[e.key].seenMessages).toString();
        }
        else {
            userNode.querySelector("div").style.display = "none";
        }
    };
    Host.prototype.removeWhiteboard = function (e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.remove();
        if (e.key === this.maximisedUser)
            _wb_host.CHAT.hideMaximised(true);
        delete this.userCache[e.key];
        if (document.querySelector("div.whiteboards").innerHTML === "")
            document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";
    };
    return Host;
}());
var HostChat = (function () {
    function HostChat(host) {
        this.seenMessages = {};
        this.host = host;
    }
    HostChat.prototype.showMaximisedBoard = function (id) {
        var div = document.querySelector("div.maximised");
        div.querySelector("img").src = document.querySelector("div#" + id + " img").src;
        div.querySelector("span").textContent = document.querySelector("div#" + id + " span").firstChild.textContent;
        div.onclick = function (e) { _wb_host.CHAT.closeClickHandler(e); };
        div.className = "maximised shown";
        this.host.maximisedUser = id;
        this.updateMaximised();
        this.host.maximisedRef = this.host.database.ref("rooms/" + this.host.roomId + "/users/" + this.host.maximisedUser);
        this.host.maximisedRef.update({
            maximised: true
        });
    };
    HostChat.prototype.updateMaximised = function () {
        var div = document.querySelector("div.maximised");
        div.querySelector("img").src = this.host.userCache[this.host.maximisedUser].data.board;
        var messagesDiv = document.querySelector("div.messages");
        messagesDiv.innerHTML = "";
        if (this.host.userCache[this.host.maximisedUser].data.messages) {
            for (var messageId in this.host.userCache[this.host.maximisedUser].data.messages) {
                var outerSpan = document.createElement("span");
                var innerSpan = document.createElement("span");
                outerSpan.className = this.host.userCache[this.host.maximisedUser].data.messages[messageId].sender + "Message";
                innerSpan.textContent = this.host.userCache[this.host.maximisedUser].data.messages[messageId].content;
                outerSpan.appendChild(innerSpan);
                messagesDiv.appendChild(outerSpan);
            }
            messagesDiv.lastChild.scrollIntoView();
            this.host.userCache[this.host.maximisedUser].seenMessages = Object.keys(this.host.userCache[this.host.maximisedUser].data.messages).length;
        }
    };
    HostChat.prototype.hideMaximised = function (deleted) {
        if (deleted === void 0) { deleted = false; }
        var div = document.querySelector("div.maximised");
        div.className = "maximised";
        div.onclick = null;
        if (!deleted) {
            this.host.maximisedRef.update({
                maximised: false
            });
        }
        else {
            Swal.fire({
                title: "User left the room.",
                text: "The user you were viewing has just left the room, so the connection to their board has been lost.",
                icon: "warning",
                background: "var(--background)"
            });
        }
        this.host.maximisedRef.off();
        this.host.maximisedRef = undefined;
        this.host.maximisedUser = undefined;
    };
    HostChat.prototype.sendMessage = function (e) {
        e.preventDefault();
        if (e.keyCode !== 13)
            return;
        var input = document.querySelector("input#messageInput");
        var messageText = input.value;
        input.value = "";
        var messagesRef = this.host.database.ref("rooms/" + this.host.roomId + "/users/" + this.host.maximisedUser + "/messages").push();
        messagesRef.set({
            sender: "host",
            content: messageText
        });
    };
    HostChat.prototype.clickHandler = function (e) {
        this.showMaximisedBoard(e.target.parentNode.id);
    };
    HostChat.prototype.closeClickHandler = function (e) {
        if (e.target.className === "maximised shown")
            this.hideMaximised();
    };
    return HostChat;
}());
var HostUI = (function () {
    function HostUI() {
        this.zoomLevel = 3;
        this.whiteboards = document.querySelector("div.whiteboards");
    }
    HostUI.prototype.setZoomLevel = function (zoomLevel) {
        this.zoomLevel = zoomLevel;
        this.whiteboards.className = "whiteboards zoom" + zoomLevel;
    };
    HostUI.prototype.zoomIn = function () { if (this.zoomLevel < 4)
        this.setZoomLevel(this.zoomLevel + 1); };
    HostUI.prototype.zoomOut = function () { if (this.zoomLevel > 1)
        this.setZoomLevel(this.zoomLevel - 1); };
    return HostUI;
}());
