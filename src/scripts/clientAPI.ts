var firebase;
var Swal;

/** Variable to hold every class instance to prevent cluttering up globals. */
let _wb: {
  CANVAS?: HTMLCanvasElement,
  CTX?: CanvasRenderingContext2D,
  HISTORY?: WhiteboardHistory,
  GRAPHICS?: Graphics,
  UI?: ClientUI,
  TOOLS?: Tools,
  EVENTS?: Events,
  CLIENT?: Client,
  CHAT?: Chat
} = {};

/**
 * Initialise the client, assigning all the different classes to properties of `_wb`.
 * Also register event handlers, and update the toolbar position once.
 */
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

  document.onpaste = (e) => { _wb.EVENTS.handlePasteHotkey(e); };
  document.oncopy = () => { _wb.EVENTS.forceCopy(); };
  window.onresize = () => { _wb.UI.placeToolbar(); };
  _wb.UI.placeToolbar();

  _wb.CANVAS.onpointermove = (e) => { _wb.EVENTS.handlePointerMove(e); };
  _wb.CANVAS.onpointerup = (e) => { _wb.EVENTS.handlePointerUp(e); };
  _wb.CANVAS.onpointerout = (e) => { _wb.EVENTS.handlePointerUp(e); };
}

window.onload = initClient;

/**
 * Class to manage all client-server operations.
 * This is basically just communicating with Firebase RTDB.
 * Constructed by linking in the graphics object to export the canvas to send to Firebase.
 * 
 * @param {Graphics} graphics - graphics object for canvas export
 */
class Client {
  database: any;
  analytics: any;
  graphics: Graphics;
  chat: Chat;

  roomId: string;
  username: string;
  userId: string;
  userRef: any;
  maximisedRef: any;
  messageRef: any;
  titleRef: any;
  ref: any;

  messageCache: {
    read: number,
    data: any
  }

  lastStrokeUpdate: number;
  maximised: boolean;

  constructor(graphics: Graphics) {
    this.database = firebase.database();
    this.analytics = firebase.analytics();
    this.graphics = graphics;
    this.roomId = window.location.search.substr(1);
    this.lastStrokeUpdate = -1;
    this.maximised = false;

    this.messageCache = {
      read: 0,
      data: null
    }
  }

  /**
   * Initialise the client-server connection and link the chat.
   * This involves creating references to the database and making the first connection.
   * It also adds event handlers for sending chat messages and alerting the database when the user leaves.
   */
  init(chat: Chat) {
    this.chat = chat;
    this.titleRef = this.database.ref(`rooms/${this.roomId}/name`);
    this.ref = this.database.ref(`rooms/${this.roomId}/users`);

    this.titleRef.on("value", this.firstConnection);
    (<HTMLInputElement>document.querySelector("input#messageInput")).onkeyup = (e) => { _wb.CHAT.sendMessage(e); };

    window.addEventListener("beforeunload", () => {
      _wb.CLIENT.analytics.logEvent("leave", { roomId: _wb.CLIENT.roomId, username: _wb.CLIENT.username });
      return _wb.CLIENT.userRef.remove().then(() => { return });
    });
  }

  /**
   * Manage the first connection to the database.
   * If it is successful, ask the user for a username, check it's not taken, then register all the database event handlers.
   * If it's not successful, alert the user that the room is invalid or closed, and redirect back to the homepage.
   */
  firstConnection(e) {
    let data = e.val();

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
        preConfirm: (login) => {
          return _wb.CLIENT.ref.once("value").then((snapshot) => {
            if (snapshot.val() !== null && _snakeCase(login) in snapshot.val()) {
              Swal.showValidationMessage("Username already taken!");
              return false;
            } else if (login.length === 0) {
              Swal.showValidationMessage("You must choose a username!");
              return false;
            } else {
              return login;
            }
          });
        },
        allowOutsideClick: false
      }).then((function (result) {
        if (result.isConfirmed) {
          this.username = result.value;
          this.userId = _snakeCase(result.value);

          this.analytics.logEvent("join", { roomId: this.roomId, username: this.username });

          this.userRef = this.database.ref(`rooms/${this.roomId}/users/${this.userId}`);
          this.userRef.set({
            name: this.username,
            board: this.graphics.exportImage(400, 300),
            maximised: false,
            messages: []
          });

          this.messageRef = this.database.ref(`rooms/${this.roomId}/users/${this.userId}/messages`);
          this.maximisedRef = this.database.ref(`rooms/${this.roomId}/users/${this.userId}/maximised`);
          this.messageRef.on("value", (e) => { this.chat.messageHandler(e); });
          this.maximisedRef.on("value", (e) => { this.updateMaximised(e); });

          window.setTimeout(() => { _wb.CLIENT.updateBoard() }, 5000);
        }
      }).bind(_wb.CLIENT));
    } else {
      Swal.fire({
        title: "Whiteboard Doesn't Exist",
        text: "This could be due to a bad link, or the room host may have closed their browser.",
        icon: "error",
        background: "var(--background)"
      }).then(() => {
        _wb.CLIENT.analytics.logEvent("failJoin", { roomId: _wb.CLIENT.roomId });
        window.location.href = "/";
      });
    }
  }

  /**
   * Update the board server-side.
   * If the client is maximised by the host, send it in much better quality and more frequently.
   * If the client is not maximised, send it at a very low resolution with heavy JPEG compression.
   * 
   * @param {boolean} force - whether to force the update, if `false` will only update if the board has changed
   */
  updateBoard(force = false) {
    if (this.lastStrokeUpdate !== this.graphics.history.strokes || force) {
      this.userRef.update({
        board: this.maximised ? this.graphics.exportImage(800, 600, 0.8) : this.graphics.exportImage(400, 300)
      });
      this.lastStrokeUpdate = this.graphics.history.strokes;
    }

    window.setTimeout(() => { _wb.CLIENT.updateBoard(); }, this.maximised ? 1000 : 5000); // update more frequently if maximised
  }

  /** Event handler for the board's maximisation state changing. */
  updateMaximised(e) {
    this.maximised = e.val();
    if (this.maximised) {
      this.updateBoard(true);
    }
  }
}

/**
 * Class managing all the chat features.
 * This is event handlers for incoming messages and for sending messages.
 * It also includes UI logic for hiding and showing the chat.
 * Constructed by linking to the client object.
 * 
 * @param {Client} client - client object to communicate with the database
 */
class Chat {
  client: Client;
  visible: boolean;

  constructor(client: Client) {
    this.client = client;
    this.visible = false;
  }

  /**
   * Message send handler, called when user presses return in the chat box.
   * Sends the message to the server.
   */
  sendMessage(e) {
    e.preventDefault();
    if (e.keyCode !== 13) return;

    let input: HTMLInputElement = document.querySelector("input#messageInput");
    let messageText = input.value;
    input.value = "";

    this.client.messageRef.push().set({
      sender: "user",
      content: messageText
    });
  }

  /**
   * Update incoming messages, called from the incoming message event handler.
   * If the chat is visible, put it in the chat.
   * If the chat is not visible, add the notification dot to tell the user a new message has arrived.
   */
  updateMessages() {
    if (this.visible) {
      let messagesDiv = document.querySelector("div.messages");
      messagesDiv.innerHTML = "";
      if (this.client.messageCache.data) {
        for (let messageId in this.client.messageCache.data) {
          let outerSpan = document.createElement("span");
          let innerSpan = document.createElement("span");
          outerSpan.className = this.client.messageCache.data[messageId].sender + "Message";
          innerSpan.textContent = this.client.messageCache.data[messageId].content;
          outerSpan.appendChild(innerSpan);
          messagesDiv.appendChild(outerSpan);
        }

        if (messagesDiv.getBoundingClientRect().right === window.innerWidth) {
          (<HTMLSpanElement>messagesDiv.lastChild).scrollIntoView();
        }
        this.client.messageCache.read = Object.keys(this.client.messageCache.data).length;
      }
    }

    let notification: HTMLDivElement = document.querySelector("div.notification");
    if (this.client.messageCache.data && Object.keys(this.client.messageCache.data).length > this.client.messageCache.read) {
      let unread = Object.keys(this.client.messageCache.data).length - this.client.messageCache.read;
      notification.style.display = "block";
      notification.textContent = unread.toString();
    } else {
      notification.style.display = "none";
    }
  }

  /** 
   * Event handler for incoming messages.
   * Caches the messages to save data, then updates them from the cache.
   */
  messageHandler(e) {
    _wb.CLIENT.messageCache.data = e.val();
    _wb.CHAT.updateMessages();
  }

  /** Manipulate the UI to show the chat, then update the messages. */
  showChat() {
    document.querySelector("div.main").className = "main chatShown";
    document.querySelector("div.clientChat").className = "clientChat chatShown";
    document.querySelector("div.clientChat i").textContent = "clear";
    (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = () => { _wb.CHAT.hideChat(); };
    this.visible = true;
    this.updateMessages();
    this.toolbarTransition();
  }

  /** Manipulate the UI to hide the chat. */
  hideChat() {
    document.querySelector("div.main").className = "main";
    document.querySelector("div.clientChat").className = "clientChat";
    document.querySelector("div.clientChat i").textContent = "message";
    (<HTMLDivElement>document.querySelector("div.clientChat div.toggle")).onclick = () => { _wb.CHAT.showChat(); };
    this.visible = false;
    this.toolbarTransition();
  }

  /** Animate the toolbar positioning for 30 frames over 500ms as the chat animates out. */
  toolbarTransition() {
    window.setInterval(() => { _wb.UI.placeToolbar(); }, 16.7);
    window.setTimeout(window.clearInterval, 500);
  }
}

/** Utility function to convert a username to snake case. */
const _snakeCase = string => {
  return string.replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};