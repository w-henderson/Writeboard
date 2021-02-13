var firebase;
var Swal;
var wb = {}; // main Writeboard object
function initClient() {
    wb.CANVAS = document.querySelector("canvas");
    wb.CTX = wb.CANVAS.getContext("2d");
    wb.HISTORY = new WhiteboardHistory();
    wb.GRAPHICS = new Graphics(wb.CTX, wb.HISTORY);
    wb.UI = new ClientUI(wb.GRAPHICS);
    wb.TOOLS = new Tools(wb.GRAPHICS, wb.HISTORY, wb.UI);
    wb.EVENTS = new Events(wb.GRAPHICS, wb.UI);
    wb.CLIENT = new Client(wb.GRAPHICS);
    wb.CHAT = new Chat(wb.CLIENT, wb.UI);
    wb.UI.linkChat(wb.CHAT);
    wb.HISTORY.linkCtx(wb.CTX, wb.UI);
    wb.CLIENT.init(wb.CHAT);
    document.onpaste = function (e) { wb.EVENTS.handlePasteHotkey(e); };
    document.oncopy = function () { wb.EVENTS.forceCopy(); };
    window.onresize = function () { wb.UI.placeToolbar(); };
    wb.UI.placeToolbar();
    wb.CANVAS.onpointermove = function (e) { wb.EVENTS.handlePointerMove(e); };
    wb.CANVAS.onpointerup = function (e) { wb.EVENTS.handlePointerUp(e); };
    wb.CANVAS.onpointerout = function (e) { wb.EVENTS.handlePointerUp(e); };
}
window.onload = initClient;
var Client = /** @class */ (function () {
    function Client(graphics) {
        this.database = firebase.database();
        this.analytics = firebase.analytics();
        this.graphics = graphics;
        this.roomId = window.location.search.substr(1);
        this.lastStrokeUpdate = -1;
        this.maximised = false;
        this.messageCache = {
            read: 0,
            data: null
        };
    }
    Client.prototype.init = function (chat) {
        this.chat = chat;
        this.titleRef = this.database.ref("rooms/" + this.roomId + "/name");
        this.ref = this.database.ref("rooms/" + this.roomId + "/users");
        this.titleRef.on("value", this.updateTitle);
        document.querySelector("input#messageInput").onkeyup = function (e) { wb.CHAT.sendMessage(e); };
        window.addEventListener("beforeunload", function () {
            wb.CLIENT.analytics.logEvent("leave", { roomId: wb.CLIENT.roomId, username: wb.CLIENT.username });
            return wb.CLIENT.userRef.remove().then(function () { return; });
        });
    };
    Client.prototype.updateTitle = function (e) {
        var data = e.val();
        if (data !== null) {
            document.querySelector("h1").textContent = "Writeboard: " + data;
            document.title = data + " - Writeboard";
            Swal.fire({
                title: 'Choose a username for this Writeboard.',
                icon: "info",
                input: 'text',
                confirmButtonText: 'Join',
                background: "var(--background)",
                showLoaderOnConfirm: true,
                preConfirm: function (login) {
                    return wb.CLIENT.ref.once("value").then(function (snapshot) {
                        if (snapshot.val() !== null && _snakeCase(login) in snapshot.val()) {
                            Swal.showValidationMessage("Username already taken!");
                            return false;
                        }
                        else if (login.length === 0) {
                            Swal.showValidationMessage("You must choose a username!");
                            return false;
                        }
                        else {
                            return login;
                        }
                    });
                },
                allowOutsideClick: false
            }).then(function (result) {
                if (result.isConfirmed) {
                    wb.CLIENT.username = result.value;
                    wb.CLIENT.userId = _snakeCase(result.value);
                    wb.CLIENT.analytics.logEvent("join", { roomId: wb.CLIENT.roomId, username: wb.CLIENT.username });
                    wb.CLIENT.userRef = wb.CLIENT.database.ref("rooms/" + wb.CLIENT.roomId + "/users/" + wb.CLIENT.userId);
                    wb.CLIENT.userRef.set({
                        name: wb.CLIENT.username,
                        board: wb.CLIENT.graphics.exportImage(400, 300),
                        maximised: false,
                        messages: []
                    });
                    wb.CLIENT.messageRef = wb.CLIENT.database.ref("rooms/" + wb.CLIENT.roomId + "/users/" + wb.CLIENT.userId + "/messages");
                    wb.CLIENT.maximisedRef = wb.CLIENT.database.ref("rooms/" + wb.CLIENT.roomId + "/users/" + wb.CLIENT.userId + "/maximised");
                    wb.CLIENT.messageRef.on("value", function (e) { wb.CLIENT.chat.messageHandler(e); });
                    wb.CLIENT.maximisedRef.on("value", function (e) { wb.CLIENT.updateMaximised(e); });
                    window.setTimeout(function () { wb.CLIENT.updateBoard(); }, 5000);
                }
            });
        }
        else {
            Swal.fire({
                title: "Whiteboard Doesn't Exist",
                text: "This could be due to a bad link, or the room host may have closed their browser.",
                icon: "error",
                background: "var(--background)"
            }).then(function () {
                wb.CLIENT.analytics.logEvent("failJoin", { roomId: wb.CLIENT.roomId });
                window.location.href = "/";
            });
        }
    };
    Client.prototype.updateBoard = function (force) {
        if (force === void 0) { force = false; }
        if (this.lastStrokeUpdate !== this.graphics.history.strokes || force) {
            this.userRef.update({
                board: this.maximised ? this.graphics.exportImage(800, 600, 0.8) : this.graphics.exportImage(400, 300)
            });
            this.lastStrokeUpdate = this.graphics.history.strokes;
        }
        window.setTimeout(function () { wb.CLIENT.updateBoard(); }, this.maximised ? 1000 : 5000); // update more frequently if maximised
    };
    Client.prototype.updateMaximised = function (e) {
        this.maximised = e.val();
        if (this.maximised) {
            this.updateBoard(true);
        }
    };
    return Client;
}());
var Chat = /** @class */ (function () {
    function Chat(client, ui) {
        this.client = client;
        this.ui = ui;
        this.visible = false;
    }
    Chat.prototype.sendMessage = function (e) {
        e.preventDefault();
        if (e.keyCode !== 13)
            return;
        var input = document.querySelector("input#messageInput");
        var messageText = input.value;
        input.value = "";
        this.client.messageRef.push().set({
            sender: "user",
            content: messageText
        });
    };
    Chat.prototype.updateMessages = function () {
        if (this.visible) {
            var messagesDiv = document.querySelector("div.messages");
            messagesDiv.innerHTML = "";
            if (this.client.messageCache.data) {
                for (var messageId in this.client.messageCache.data) {
                    var outerSpan = document.createElement("span");
                    var innerSpan = document.createElement("span");
                    outerSpan.className = this.client.messageCache.data[messageId].sender + "Message";
                    innerSpan.textContent = this.client.messageCache.data[messageId].content;
                    outerSpan.appendChild(innerSpan);
                    messagesDiv.appendChild(outerSpan);
                }
                if (messagesDiv.getBoundingClientRect().right === window.innerWidth) {
                    messagesDiv.lastChild.scrollIntoView();
                }
                this.client.messageCache.read = Object.keys(this.client.messageCache.data).length;
            }
        }
        var notification = document.querySelector("div.notification");
        if (this.client.messageCache.data && Object.keys(this.client.messageCache.data).length > this.client.messageCache.read) {
            var unread = Object.keys(this.client.messageCache.data).length - this.client.messageCache.read;
            notification.style.display = "block";
            notification.textContent = unread.toString();
        }
        else {
            notification.style.display = "none";
        }
    };
    Chat.prototype.messageHandler = function (e) {
        wb.CLIENT.messageCache.data = e.val();
        wb.CHAT.updateMessages();
    };
    Chat.prototype.showChat = function () {
        document.querySelector("div.main").className = "main chatShown";
        document.querySelector("div.clientChat").className = "clientChat chatShown";
        document.querySelector("div.clientChat i").textContent = "clear";
        document.querySelector("div.clientChat div.toggle").onclick = function () { wb.CHAT.hideChat(); };
        this.visible = true;
        this.updateMessages();
        this.toolbarTransition();
    };
    Chat.prototype.hideChat = function () {
        document.querySelector("div.main").className = "main";
        document.querySelector("div.clientChat").className = "clientChat";
        document.querySelector("div.clientChat i").textContent = "message";
        document.querySelector("div.clientChat div.toggle").onclick = function () { wb.CHAT.showChat(); };
        this.visible = false;
        this.toolbarTransition();
    };
    Chat.prototype.toolbarTransition = function () {
        window.setInterval(function () { wb.UI.placeToolbar(); }, 16.7);
        window.setTimeout(window.clearInterval, 500);
    };
    return Chat;
}());
var _snakeCase = function (string) {
    return string.replace(/\W+/g, " ")
        .split(/ |\B(?=[A-Z])/)
        .map(function (word) { return word.toLowerCase(); })
        .join('_');
};
