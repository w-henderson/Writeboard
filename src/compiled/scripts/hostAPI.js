var firebase;
var MathJax;
var Swal;
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
        this.userCache = {};
        this.allowedNotifications = false;
        this.locked = false;
        this.homepage = (window.location.hostname === "localhost" || window.location.hostname === "192.168.1.1") ? "/" : "//writeboard.ga/";
        if (this.homepage === "/")
            this.roomId = window.localStorage.getItem("writeboardTempId");
        else {
            var cookieRegex = new RegExp(/writeboardTempId=[A-Z]{6}/);
            this.roomId = document.cookie.match(cookieRegex)[0].split("=")[1];
        }
        if (!this.roomId) {
            Swal.fire({
                title: "Error 404",
                text: "Writeboard Not Found",
                icon: "error",
                background: "var(--background)"
            }).then(function () {
                _this.analytics.logEvent("failHost", {});
                window.location.href = _this.homepage;
            });
        }
        else {
            this.ref = this.database.ref("rooms/" + this.roomId + "/users");
            this.titleRef = this.database.ref("rooms/" + this.roomId + "/name");
            this.titleRef.once("value", function (e) { _wb_host.HOST.updateTitle(e); });
            this.ref.on("child_added", function (e) { _wb_host.HOST.addWhiteboard(e); });
            this.ref.on("child_changed", function (e) { _wb_host.HOST.updateWhiteboard(e); });
            this.ref.on("child_removed", function (e) { _wb_host.HOST.removeWhiteboard(e); });
            window.localStorage.removeItem("writeboardTempId");
            Notification.requestPermission().then(function (result) {
                _this.allowedNotifications = result === "granted";
            });
        }
        document.querySelector("input#messageInput").onkeyup = function (e) { _wb_host.CHAT.sendMessage(e); };
        window.addEventListener("beforeunload", function () { _wb_host.HOST.closeRoom(true); });
    }
    Host.prototype.updateTitle = function (e) {
        var data = e.val();
        document.title = data + " - Writeboard";
        document.querySelector("h1").textContent = data + " (" + this.roomId + ")";
        this.analytics.logEvent("host", { roomId: this.roomId, title: data });
    };
    Host.prototype.addWhiteboard = function (e) {
        var whiteboards = document.querySelector("section.board");
        if (whiteboards.textContent.trim() === "Waiting for people to connect...")
            whiteboards.innerHTML = "";
        var userNode = document.createElement("div");
        var userWhiteboard = document.createElement("img");
        var userName = document.createElement("span");
        var messageIndicator = document.createElement("div");
        var kickButton = document.createElement("i");
        userWhiteboard.src = e.val().board;
        userWhiteboard.onclick = function (e) { _wb_host.CHAT.clickHandler(e); };
        userName.textContent = e.val().name;
        userNode.id = e.key;
        messageIndicator.style.display = "none";
        kickButton.className = "material-icons-round";
        kickButton.textContent = "clear";
        kickButton.onclick = function (e) { _wb_host.HOST.kickUser(e); };
        userName.appendChild(kickButton);
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
        var userNode = document.querySelector("section.board div#" + e.key);
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
        var userNode = document.querySelector("section.board div#" + e.key);
        userNode.remove();
        if (e.key === this.maximisedUser)
            _wb_host.CHAT.hideMaximised(true);
        delete this.userCache[e.key];
        if (document.querySelector("section.board").innerHTML === "")
            document.querySelector("section.board").textContent = "Waiting for people to connect...";
    };
    Host.prototype.toggleLock = function () {
        var _this = this;
        Swal.fire({
            title: (this.locked ? "Unlock" : "Lock") + " this room?",
            text: "Are you sure you want to " + (this.locked ? "unlock" : "lock") + " this room?",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Yes",
            denyButtonText: "No",
            background: "var(--background)"
        }).then(function (result) {
            if (result.isConfirmed) {
                _this.locked = !_this.locked;
                document.querySelector("i#lockIcon").textContent = _this.locked ? "lock" : "lock_open";
                _this.database.ref("rooms/" + _this.roomId + "/authLevel").set(_this.locked ? 4 : 0);
            }
        });
    };
    Host.prototype.kickUser = function (e) {
        var _this = this;
        var userToKick = e.target.parentElement.parentElement.id;
        var username = e.target.parentElement.childNodes[0].textContent.trim();
        Swal.fire({
            title: "Kick " + username + "?",
            text: "Are you sure you want to kick " + username + "? This will also remove their board contents.",
            icon: "warning",
            showDenyButton: true,
            confirmButtonText: "Yes, kick them",
            denyButtonText: "No",
            background: "var(--background)"
        }).then(function (result) {
            if (result.isConfirmed) {
                _this.database.ref("rooms/" + _this.roomId + "/users/" + userToKick + "/kicked").set(true);
            }
        });
    };
    Host.prototype.closeRoom = function (force) {
        if (force === void 0) { force = false; }
        if (!force) {
            Swal.fire({
                title: "Close this room?",
                text: "This action cannot be undone and will delete all users' boards.",
                icon: "warning",
                showDenyButton: true,
                confirmButtonText: "Yes, close the room",
                denyButtonText: "No",
                background: "var(--background)"
            }).then(function (result) {
                if (result.isConfirmed) {
                    _wb_host.HOST.closeRoom(true);
                }
            });
        }
        else {
            _wb_host.HOST.analytics.logEvent("closeRoom", { roomId: _wb_host.HOST.roomId });
            _wb_host.HOST.database.ref("rooms/" + _wb_host.HOST.roomId).remove();
            window.location.href = _wb_host.HOST.homepage;
        }
    };
    return Host;
}());
var HostChat = (function () {
    function HostChat(host) {
        this.host = host;
        this.seenMessages = {};
        this.sentMessages = 0;
        this.visible = window.innerWidth > 1300 || (window.innerWidth > 1100 && window.innerWidth / window.innerHeight < 5 / 3);
        window.addEventListener("resize", function () {
            _wb.CHAT.hideChat();
        });
    }
    HostChat.prototype.detectMaths = function (message) {
        if (message.includes("\\(") && message.includes("\\)"))
            return false;
        return message.includes("x^") || message.trim().includes("y=") || message.trim().includes("dy/dx");
    };
    HostChat.prototype.setAsMaths = function (e) {
        var id = e.target.parentElement.parentElement.id.replace("message_", "");
        this.host.database.ref("rooms/" + this.host.roomId + "/users/" + this.host.maximisedUser + "/messages/" + id + "/maths").set(true);
    };
    HostChat.prototype.showMaximisedBoard = function (id) {
        var img = document.querySelector("img#maximisedImage");
        img.src = document.querySelector("div#" + id + " img").src;
        document.querySelector("h1#chatHeader").innerHTML = "Chat with <span id=\"maximisedName\">" + document.querySelector("div#" + id + " span").firstChild.textContent + "</span>";
        document.querySelector("input").disabled = false;
        this.host.maximisedUser = id;
        this.updateMaximised();
        this.host.maximisedRef = this.host.database.ref("rooms/" + this.host.roomId + "/users/" + this.host.maximisedUser);
        this.host.maximisedRef.update({
            maximised: true
        });
    };
    HostChat.prototype.updateMaximised = function () {
        var img = document.querySelector("img#maximisedImage");
        if (this.host.maximisedUser == undefined) {
            img.src = "images/maximised_placeholder.jpg";
            document.querySelector("h1#chatHeader").innerHTML = "Select a <span id=\"maximisedName\">Student</span>";
            document.querySelector("div.messages").innerHTML = "";
            document.querySelector("input").disabled = true;
            return;
        }
        img.src = this.host.userCache[this.host.maximisedUser].data.board;
        var messagesDiv = document.querySelector("div.messages");
        messagesDiv.innerHTML = "";
        if (this.host.userCache[this.host.maximisedUser].data.messages) {
            for (var messageId in this.host.userCache[this.host.maximisedUser].data.messages) {
                var outerSpan = document.createElement("span");
                var innerSpan = document.createElement("span");
                var sender = this.host.userCache[this.host.maximisedUser].data.messages[messageId].sender;
                outerSpan.className = sender === "host" ? "localMessage" : "remoteMessage";
                outerSpan.appendChild(innerSpan);
                if (outerSpan.className === "remoteMessage") {
                    var avatar = document.createElement("img");
                    avatar.src = "images/avatar.png";
                    outerSpan.prepend(avatar);
                }
                outerSpan.id = "message_" + messageId;
                if (this.host.userCache[this.host.maximisedUser].data.messages[messageId].maths) {
                    innerSpan.textContent = "\\(" + this.host.userCache[this.host.maximisedUser].data.messages[messageId].content + "\\)";
                }
                else if (this.detectMaths(this.host.userCache[this.host.maximisedUser].data.messages[messageId].content)) {
                    innerSpan.textContent = this.host.userCache[this.host.maximisedUser].data.messages[messageId].content;
                    var hintP = document.createElement("p");
                    var br = document.createElement("br");
                    var u = document.createElement("u");
                    hintP.textContent = "This looks like maths, ";
                    u.textContent = "style as such?";
                    u.onclick = function (e) { _wb_host.CHAT.setAsMaths(e); };
                    hintP.appendChild(u);
                    outerSpan.appendChild(br);
                    outerSpan.appendChild(hintP);
                }
                else {
                    innerSpan.textContent = this.host.userCache[this.host.maximisedUser].data.messages[messageId].content;
                }
                messagesDiv.appendChild(outerSpan);
            }
            MathJax.typeset();
            messagesDiv.lastChild.scrollIntoView();
            this.host.userCache[this.host.maximisedUser].seenMessages = Object.keys(this.host.userCache[this.host.maximisedUser].data.messages).length;
        }
    };
    HostChat.prototype.hideMaximised = function (deleted) {
        if (deleted === void 0) { deleted = false; }
        var img = document.querySelector("img#maximisedImage");
        img.src = "images/maximised_placeholder.jpg";
        document.querySelector("h1#chatHeader").innerHTML = "Select a <span id=\"maximisedName\">Student</span>";
        document.querySelector("div.messages").innerHTML = "";
        document.querySelector("input").disabled = true;
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
        if (e === void 0) { e = null; }
        if (this.host.maximisedUser === undefined)
            return;
        if (e != null) {
            e.preventDefault();
            if (e.keyCode !== 13)
                return;
        }
        var input = document.querySelector("input#messageInput");
        var messageText = input.value;
        input.value = "";
        this.sentMessages++;
        var messagesRef = this.host.database.ref("rooms/" + this.host.roomId + "/users/" + this.host.maximisedUser + "/messages").push();
        messagesRef.set({
            sender: "host",
            content: messageText,
            maths: false
        });
    };
    HostChat.prototype.clickHandler = function (e) {
        this.showMaximisedBoard(e.target.parentNode.id);
    };
    HostChat.prototype.showChat = function () {
        document.querySelector("section.chat").className = "chat host visible";
        document.querySelector("i.notification").onclick = function () { _wb_host.CHAT.hideChat(); };
        this.visible = true;
        this.updateMaximised();
    };
    HostChat.prototype.hideChat = function () {
        document.querySelector("section.chat").className = "chat host";
        document.querySelector("i.notification").onclick = function () { _wb_host.CHAT.showChat(); };
        this.visible = window.innerWidth > 1300 || (window.innerWidth > 1100 && window.innerWidth / window.innerHeight < 5 / 3);
        this.updateMaximised();
    };
    return HostChat;
}());
var HostUI = (function () {
    function HostUI() {
        this.zoomLevel = 3;
        this.whiteboards = document.querySelector("section.board");
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
