var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var firebase;
var Swal;
var _wb = {};
function initClient() {
    _wb.CANVAS = document.querySelector("canvas");
    _wb.CTX = _wb.CANVAS.getContext("2d");
    _wb.HISTORY = new WhiteboardHistory();
    _wb.GRAPHICS = new Graphics(_wb.CTX, _wb.HISTORY);
    _wb.UI = new ClientUI(_wb.GRAPHICS);
    _wb.TOOLS = new Tools(_wb.GRAPHICS, _wb.HISTORY, _wb.UI);
    _wb.EVENTS = new Events(_wb.GRAPHICS, _wb.UI);
    _wb.CLIENT = new Client(_wb.GRAPHICS);
    _wb.CHAT = new Chat(_wb.CLIENT);
    _wb.UI.linkChat(_wb.CHAT);
    _wb.HISTORY.linkCtx(_wb.CTX, _wb.UI);
    _wb.CLIENT.init(_wb.CHAT);
    document.onpaste = function (e) { _wb.EVENTS.handlePasteHotkey(e); };
    document.oncopy = function () { _wb.EVENTS.forceCopy(); };
    window.onresize = function () { _wb.UI.placeToolbar(); };
    _wb.UI.placeToolbar();
    _wb.CANVAS.onpointermove = function (e) { _wb.EVENTS.handlePointerMove(e); };
    _wb.CANVAS.onpointerup = function (e) { _wb.EVENTS.handlePointerUp(e); };
    _wb.CANVAS.onpointerout = function (e) { _wb.EVENTS.handlePointerUp(e); };
}
window.onload = initClient;
var Client = (function () {
    function Client(graphics) {
        this.database = firebase.database();
        this.analytics = firebase.analytics();
        this.graphics = graphics;
        this.roomId = window.location.search.substr(1);
        this.lastStrokeUpdate = -1;
        this.maximised = false;
        this.kicked = false;
        this.allowedNotifications = false;
        this.messageCache = {
            read: 0,
            data: null
        };
    }
    Client.prototype.init = function (chat) {
        this.chat = chat;
        this.initRef = this.database.ref("rooms/" + this.roomId + "/name");
        this.ref = this.database.ref("rooms/" + this.roomId + "/users");
        this.initRef.on("value", this.firstConnection);
        document.querySelector("input#messageInput").onkeyup = function (e) { _wb.CHAT.sendMessage(e); };
    };
    Client.prototype.firstConnection = function (e) {
        return __awaiter(this, void 0, void 0, function () {
            var data, authLevel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = e.val();
                        return [4, _wb.CLIENT.database.ref("rooms/" + _wb.CLIENT.roomId + "/authLevel").once("value").then(function (v) { return v.val(); })];
                    case 1:
                        authLevel = _a.sent();
                        if (authLevel === 0) {
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
                                    return _wb.CLIENT.ref.once("value").then(function (snapshot) {
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
                            }).then((function (result) {
                                var _this = this;
                                if (result.isConfirmed) {
                                    this.username = result.value;
                                    this.userId = _snakeCase(result.value);
                                    this.analytics.logEvent("join", { roomId: this.roomId, username: this.username });
                                    this.userRef = this.database.ref("rooms/" + this.roomId + "/users/" + this.userId);
                                    this.userRef.set({
                                        name: this.username,
                                        board: this.graphics.exportImage(400, 300),
                                        maximised: false,
                                        kicked: false,
                                        messages: []
                                    });
                                    this.messageRef = this.database.ref("rooms/" + this.roomId + "/users/" + this.userId + "/messages");
                                    this.maximisedRef = this.database.ref("rooms/" + this.roomId + "/users/" + this.userId + "/maximised");
                                    this.kickRef = this.database.ref("rooms/" + this.roomId + "/users/" + this.userId + "/kicked");
                                    this.messageRef.on("value", function (e) { _this.chat.messageHandler(e); });
                                    this.maximisedRef.on("value", function (e) { _this.updateMaximised(e); });
                                    this.kickRef.on("value", function (e) { _this.kickCallback(e); });
                                    Notification.requestPermission().then(function (result) {
                                        _this.allowedNotifications = result === "granted";
                                    });
                                    window.addEventListener("beforeunload", function () {
                                        if (!_wb.CLIENT.kicked) {
                                            _wb.CLIENT.analytics.logEvent("leave", { roomId: _wb.CLIENT.roomId, username: _wb.CLIENT.username });
                                            return _wb.CLIENT.userRef.remove().then(function () { return; });
                                        }
                                    });
                                    window.setTimeout(function () { _wb.CLIENT.updateBoard(); }, 5000);
                                }
                            }).bind(_wb.CLIENT));
                        }
                        else if (data !== null) {
                            Swal.fire({
                                title: "Whiteboard is locked.",
                                text: "The owner of this room has opted to lock the room, so no new members can join.",
                                icon: "error",
                                background: "var(--background)"
                            }).then(function () {
                                _wb.CLIENT.analytics.logEvent("failJoin", { roomId: _wb.CLIENT.roomId });
                                window.location.href = "/";
                            });
                        }
                        else {
                            Swal.fire({
                                title: "Whiteboard doesn't exist.",
                                text: "This could be due to a bad link, or the room host may have closed their browser.",
                                icon: "error",
                                background: "var(--background)"
                            }).then(function () {
                                _wb.CLIENT.analytics.logEvent("failJoin", { roomId: _wb.CLIENT.roomId });
                                window.location.href = "/";
                            });
                        }
                        return [2];
                }
            });
        });
    };
    Client.prototype.updateBoard = function (force) {
        if (force === void 0) { force = false; }
        if (this.lastStrokeUpdate !== this.graphics.history.strokes || force) {
            this.userRef.update({
                board: this.maximised ? this.graphics.exportImage(800, 600, 0.8) : this.graphics.exportImage(400, 300)
            });
            this.lastStrokeUpdate = this.graphics.history.strokes;
        }
        window.setTimeout(function () { _wb.CLIENT.updateBoard(); }, this.maximised ? 1000 : 5000);
    };
    Client.prototype.updateMaximised = function (e) {
        this.maximised = e.val();
        if (this.maximised) {
            this.updateBoard(true);
        }
    };
    Client.prototype.kickCallback = function (e) {
        if (e.val() === true) {
            this.userRef.off();
            this.maximisedRef.off();
            this.messageRef.off();
            this.kickRef.off();
            this.ref.off();
            this.kicked = true;
            window.clearTimeout();
            this.userRef.remove();
            Swal.fire({
                title: "You have been kicked.",
                text: "You have been kicked from the room by the host.",
                icon: "error",
                background: "var(--background)",
                allowOutsideClick: false
            }).then(function () {
                window.location.href = "/";
            });
        }
    };
    return Client;
}());
var Chat = (function () {
    function Chat(client) {
        this.client = client;
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
        var _a;
        var messageKeys = Object.keys((_a = this.client.messageCache.data) !== null && _a !== void 0 ? _a : {});
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
                this.client.messageCache.read = messageKeys.length;
            }
        }
        else if (this.client.allowedNotifications && document.hidden) {
            new Notification("New Writeboard Message", { body: this.client.messageCache.data[messageKeys[messageKeys.length - 1]].content });
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
        _wb.CLIENT.messageCache.data = e.val();
        _wb.CHAT.updateMessages();
    };
    Chat.prototype.showChat = function () {
        document.querySelector("div.main").className = "main chatShown";
        document.querySelector("div.clientChat").className = "clientChat chatShown";
        document.querySelector("div.clientChat i").textContent = "clear";
        document.querySelector("div.clientChat div.toggle").onclick = function () { _wb.CHAT.hideChat(); };
        this.visible = true;
        this.updateMessages();
        this.toolbarTransition();
    };
    Chat.prototype.hideChat = function () {
        document.querySelector("div.main").className = "main";
        document.querySelector("div.clientChat").className = "clientChat";
        document.querySelector("div.clientChat i").textContent = "message";
        document.querySelector("div.clientChat div.toggle").onclick = function () { _wb.CHAT.showChat(); };
        this.visible = false;
        this.toolbarTransition();
    };
    Chat.prototype.toolbarTransition = function () {
        window.setInterval(function () { _wb.UI.placeToolbar(); }, 16.7);
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
