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
var Swal;
var firebase;
var _wb_home = {};
function initHome() {
    _wb_home.UI = new HomepageUI();
}
window.onload = initHome;
var HomepageUI = (function () {
    function HomepageUI() {
        this.database = firebase.database();
        this.updateSizing();
        this.updateLatestUpdates();
        window.onresize = function () { _wb_home.UI.updateSizing(); };
    }
    HomepageUI.prototype.route = function (r) {
        if (window.location.hostname !== "localhost" && window.location.hostname !== "192.168.1.1")
            return r;
        else
            return r + ".html";
    };
    HomepageUI.prototype.scrollToAnchor = function (name) {
        document.querySelector(".navigation").className = "navigation";
        document.querySelector("a[name=\"" + name + "\"]").scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, null, "#" + name);
    };
    HomepageUI.prototype.joinRoom = function () {
        var _this = this;
        Swal.fire({
            title: 'Enter the room ID.',
            text: "Ask the room host if you don't know the room ID.",
            icon: "info",
            input: 'text',
            confirmButtonText: 'Join',
            background: "var(--background)",
            showLoaderOnConfirm: true,
            allowOutsideClick: true,
            preConfirm: function (id) { return __awaiter(_this, void 0, void 0, function () {
                var regex, valid_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            regex = new RegExp("^[a-zA-Z]{6}$");
                            if (!!regex.test(id)) return [3, 1];
                            Swal.showValidationMessage("Room ID should be six letters.");
                            return [2, false];
                        case 1:
                            valid_1 = "invalid";
                            return [4, this.database.ref("rooms/" + id.toUpperCase()).once("value", function (snapshot) {
                                    if (snapshot.val() !== null) {
                                        if (snapshot.val().authLevel === 0) {
                                            valid_1 = "valid";
                                        }
                                        else {
                                            valid_1 = "locked";
                                        }
                                    }
                                })];
                        case 2:
                            _a.sent();
                            if (valid_1 === "invalid")
                                Swal.showValidationMessage("Room cannot be found.");
                            if (valid_1 === "locked")
                                Swal.showValidationMessage("Room is locked.");
                            return [2, valid_1 === "valid" ? id.toUpperCase() : false];
                    }
                });
            }); }
        }).then(function (result) {
            if (result.isConfirmed) {
                var roomId = result.value;
                window.location.href = "/" + _this.route("client") + "?" + roomId;
            }
        });
    };
    HomepageUI.prototype.hostRoom = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                Swal.fire({
                    title: 'Name your room.',
                    text: "This will appear at the top of your screen along with the room code.",
                    icon: "info",
                    input: 'text',
                    confirmButtonText: 'Create',
                    background: "var(--background)",
                    allowOutsideClick: true,
                    preConfirm: function (name) {
                        if (name.length === 0) {
                            Swal.showValidationMessage("You must name your room!");
                            return false;
                        }
                        else {
                            return name;
                        }
                    }
                }).then(function (result) { return __awaiter(_this, void 0, void 0, function () {
                    var roomName, alphabet_1, valid_2, code_1, i;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!result.isConfirmed) return [3, 4];
                                roomName = result.value;
                                alphabet_1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                                valid_2 = false;
                                code_1 = "";
                                for (i = 0; i < 6; i++)
                                    code_1 += alphabet_1[Math.floor(Math.random() * 26)];
                                _a.label = 1;
                            case 1:
                                if (!!valid_2) return [3, 3];
                                return [4, this.database.ref("rooms/" + code_1).once("value", function (snapshot) {
                                        if (snapshot.val() === null) {
                                            valid_2 = true;
                                        }
                                        else {
                                            code_1 = "";
                                            for (var i = 0; i < 6; i++)
                                                code_1 += alphabet_1[Math.floor(Math.random() * 26)];
                                        }
                                    })];
                            case 2:
                                _a.sent();
                                return [3, 1];
                            case 3:
                                this.database.ref("rooms/" + code_1).set({
                                    name: roomName,
                                    authLevel: 0,
                                    users: {}
                                }).then(function () {
                                    window.localStorage.setItem("writeboardTempId", code_1);
                                    window.location.href = "/" + _this.route("host");
                                })["catch"](function () {
                                    Swal.fire({
                                        title: "An error occurred.",
                                        icon: "error",
                                        background: "var(--background)"
                                    });
                                });
                                _a.label = 4;
                            case 4: return [2];
                        }
                    });
                }); });
                return [2];
            });
        });
    };
    HomepageUI.prototype.privacy = function () {
        Swal.fire({
            icon: "info",
            width: 800,
            title: "Our Privacy Policy",
            html: "Here at Writeboard, we're committed to your privacy, which is why this privacy policy aims to be as transparent as possible.\n      All the data we collect is for the sole purpose of improving Writeboard, and we never share any data with any third parties.\n      <h2>What data do we collect?</h2>\n        <ul>\n          <li>Device information such as OS, model etc</li>\n          <li>Browser information such as name, version, screen resolution etc</li>\n          <li>Mode of input such as pen, touch, mouse etc</li>\n          <li>When and how often you create, join, leave, or close a room</li>\n          <li>Vague location estimated by Google, not personally identifiable</li>\n        </ul>\n      <h2>What data don't we collect?</h2>\n      <ul>\n        <li>Any personally-identifiable data</li>\n        <li>IP addresses</li>\n      </ul>",
            confirmButtonText: "Close",
            background: "var(--background)"
        });
    };
    HomepageUI.prototype.updateSizing = function () {
        var height = (window.visualViewport.width * 0.176) + 170;
        document.querySelector("div.banner").style.height = height + "px";
        document.querySelectorAll("div.banner img").forEach(function (div) {
            div.style.height = height + "px";
            div.style.left = "calc(50% - " + height * 2 + "px)";
        });
    };
    HomepageUI.prototype.updateLatestUpdates = function () {
        var updateList = document.querySelector("#updateList");
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
    };
    return HomepageUI;
}());
