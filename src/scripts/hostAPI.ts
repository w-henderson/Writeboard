var Swal: any;
var firebase: FirebaseNamespace;

/** Variable to hold all the class instances to prevent cluttering up globals. */
let _wb_host: {
  HOST?: Host,
  CHAT?: HostChat,
  UI?: HostUI
} = {};

/** Initialises the host and the chat. */
function initHost() {
  _wb_host.HOST = new Host();
  _wb_host.CHAT = new HostChat(_wb_host.HOST);
  _wb_host.UI = new HostUI();
}

window.onload = initHost;

/**
 * Class managing all the host activities.
 * This includes board management and room management.
 * Chat is managed in `HostChat`.
 */
class Host {
  database: FirebaseDatabase;
  analytics: any;

  roomId: string;
  maximisedUser: string;
  userCache: any;

  ref: Reference;
  titleRef: Reference;
  maximisedRef: Reference;

  allowedNotifications: boolean;

  constructor() {
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
      }).then(() => {
        this.analytics.logEvent("failHost", {});
        window.location.href = "/";
      });
    } else {
      this.ref = this.database.ref(`rooms/${this.roomId}/users`);
      this.titleRef = this.database.ref(`rooms/${this.roomId}/name`);
      this.titleRef.once("value", (e) => { _wb_host.HOST.updateTitle(e); });

      this.ref.on("child_added", (e) => { _wb_host.HOST.addWhiteboard(e); });
      this.ref.on("child_changed", (e) => { _wb_host.HOST.updateWhiteboard(e); });
      this.ref.on("child_removed", (e) => { _wb_host.HOST.removeWhiteboard(e); });

      Notification.requestPermission().then((result: NotificationPermission) => {
        this.allowedNotifications = result === "granted";
      });

      window.localStorage.removeItem("writeboardTempId");
    }

    (<HTMLInputElement>document.querySelector("input#messageInput")).onkeyup = (e) => { _wb_host.CHAT.sendMessage(e); };
    window.addEventListener("beforeunload", () => { _wb_host.HOST.closeRoom(true); });
  }

  /**
   * Updates the title of the board and logs the host event.
   * This is called once when the room is created.
   */
  updateTitle(e) {
    let data = e.val();
    document.title = `${data} - Writeboard`;
    document.querySelector("h1").textContent = `${data} (${this.roomId})`;

    this.analytics.logEvent("host", { roomId: this.roomId, title: data });
  }

  /**
   * Adds a whiteboard to the room.
   * The whiteboard is then cached so it can be easily accessed if maximised.
   */
  addWhiteboard(e: DataSnapshot) {
    let whiteboards = document.querySelector("div.whiteboards");
    if (whiteboards.textContent.trim() === "Waiting for people to connect...") whiteboards.innerHTML = "";

    let userNode = document.createElement("div");
    let userWhiteboard = document.createElement("img");
    let userName = document.createElement("span");
    let messageIndicator = document.createElement("div");
    let kickButton = document.createElement("i");

    userWhiteboard.src = e.val().board;
    userWhiteboard.onclick = (e) => { _wb_host.CHAT.clickHandler(e); };
    userName.textContent = e.val().name;
    userNode.id = e.key;
    messageIndicator.style.display = "none";
    kickButton.className = "material-icons-round";
    kickButton.textContent = "clear";
    kickButton.onclick = (e) => { _wb_host.HOST.kickUser(e); };

    userName.appendChild(kickButton);
    userNode.appendChild(userWhiteboard);
    userNode.appendChild(userName);
    userNode.appendChild(messageIndicator);
    whiteboards.appendChild(userNode);

    this.userCache[e.key] = {
      data: e.val(),
      seenMessages: 0
    }
  }

  /** Updates a whiteboard already in the room. */
  updateWhiteboard(e: DataSnapshot) {
    let data = e.val();
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.querySelector("img").src = data.board;
    userNode.querySelector("span").firstChild.textContent = data.name;

    this.userCache[e.key].data = e.val();

    let messageKeys = Object.keys(this.userCache[e.key].data.messages ?? {});

    if (e.key === this.maximisedUser) _wb_host.CHAT.updateMaximised();
    else if (this.allowedNotifications && data.messages && messageKeys.length > this.userCache[e.key].seenMessages && document.hidden) {
      new Notification(
        `New Writeboard Message from ${data.name}`,
        {
          body: data.messages[messageKeys[messageKeys.length - 1]].content,
          image: data.board
        }
      )
    }

    if (this.userCache[e.key].data.messages && messageKeys.length > this.userCache[e.key].seenMessages) {
      userNode.querySelector("div").style.display = "block";
      userNode.querySelector("div").textContent = (messageKeys.length - this.userCache[e.key].seenMessages).toString();
    } else {
      userNode.querySelector("div").style.display = "none";
    }
  }

  /** Removes a whiteboard from the room. */
  removeWhiteboard(e: DataSnapshot) {
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.remove();

    if (e.key === this.maximisedUser) _wb_host.CHAT.hideMaximised(true);

    delete this.userCache[e.key];

    if (document.querySelector("div.whiteboards").innerHTML === "") document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";
  }

  /**
   * Kicks a user from the room.
   * Called as an `onclick` callback from the kick button.
   */
  kickUser(e) {
    let userToKick: string = e.target.parentElement.parentElement.id;
    let username: string = e.target.parentElement.childNodes[0].textContent.trim();

    Swal.fire({
      title: `Kick ${username}?`,
      text: `Are you sure you want to kick ${username}? This will also remove their board contents.`,
      icon: "warning",
      showDenyButton: true,
      confirmButtonText: "Yes, kick them",
      denyButtonText: "No",
      background: "var(--background)"
    }).then((result) => {
      if (result.isConfirmed) {
        this.database.ref(`rooms/${this.roomId}/users/${userToKick}/kicked`).set(true);
      }
    });
  }

  /**
   * Closes the room and removes all users.
   * By default, asks the user to confirm the action.
   * 
   * @param {Boolean} force - whether to close without asking the user to confirm.
   */
  closeRoom(force: boolean = false) {
    if (!force) {
      Swal.fire({
        title: "Close this room?",
        text: "This action cannot be undone and will delete all users' boards.",
        icon: "warning",
        showDenyButton: true,
        confirmButtonText: "Yes, close the room",
        denyButtonText: "No",
        background: "var(--background)"
      }).then((result) => {
        if (result.isConfirmed) {
          this.closeRoom(true);
        }
      })
    } else {
      _wb_host.HOST.analytics.logEvent("closeRoom", { roomId: _wb_host.HOST.roomId });
      _wb_host.HOST.database.ref(`rooms/${_wb_host.HOST.roomId}`).remove();
      window.location.href = "/";
    }
  }
}

/**
 * Class managing chat features for the host.
 * This includes maximising and minimising boards, as well as chat.
 * Constructed by passing in the host instance.
 * 
 * @param {Host} host - host instance to connect to
 */
class HostChat {
  seenMessages: any;
  host: Host;

  constructor(host: Host) {
    this.seenMessages = {};
    this.host = host;
  }

  /** Toggles the specified user ID's board to become maximised. */
  showMaximisedBoard(id: string) {
    let div: HTMLElement = document.querySelector("div.maximised");

    div.querySelector("img").src = (<HTMLImageElement>document.querySelector(`div#${id} img`)).src;
    div.querySelector("span").textContent = document.querySelector(`div#${id} span`).firstChild.textContent;
    div.onclick = (e) => { _wb_host.CHAT.closeClickHandler(e); };

    div.className = "maximised shown";
    this.host.maximisedUser = id;

    this.updateMaximised();

    this.host.maximisedRef = this.host.database.ref(`rooms/${this.host.roomId}/users/${this.host.maximisedUser}`);
    this.host.maximisedRef.update({
      maximised: true
    });
  }

  /** Updates a maximised board. This also updates messages. */
  updateMaximised() {
    let div: HTMLElement = document.querySelector("div.maximised");
    div.querySelector("img").src = this.host.userCache[this.host.maximisedUser].data.board;

    let messagesDiv = document.querySelector("div.messages");
    messagesDiv.innerHTML = "";
    if (this.host.userCache[this.host.maximisedUser].data.messages) {
      for (let messageId in this.host.userCache[this.host.maximisedUser].data.messages) {
        let outerSpan = document.createElement("span");
        let innerSpan = document.createElement("span");
        outerSpan.className = this.host.userCache[this.host.maximisedUser].data.messages[messageId].sender + "Message";
        innerSpan.textContent = this.host.userCache[this.host.maximisedUser].data.messages[messageId].content;
        outerSpan.appendChild(innerSpan);
        messagesDiv.appendChild(outerSpan);
      }

      (<HTMLSpanElement>messagesDiv.lastChild).scrollIntoView();
      this.host.userCache[this.host.maximisedUser].seenMessages = Object.keys(this.host.userCache[this.host.maximisedUser].data.messages).length;
    }
  }

  /** Hides the maximised board. If it was deleted, inform the host. */
  hideMaximised(deleted = false) {
    let div: HTMLElement = document.querySelector("div.maximised");
    div.className = "maximised";
    div.onclick = null;

    if (!deleted) {
      this.host.maximisedRef.update({
        maximised: false
      });
    } else {
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
  }

  /** Send a message to the client. This is called on pressing the return key in the message box. */
  sendMessage(e) {
    e.preventDefault();
    if (e.keyCode !== 13) return;

    let input: HTMLInputElement = document.querySelector("input#messageInput");
    let messageText = input.value;
    input.value = "";

    let messagesRef = this.host.database.ref(`rooms/${this.host.roomId}/users/${this.host.maximisedUser}/messages`).push();
    messagesRef.set({
      sender: "host",
      content: messageText
    });
  }

  /** Handles clicks on each board. */
  clickHandler(e) {
    this.showMaximisedBoard(e.target.parentNode.id);
  }

  /** Handles clicks outside the maximised board. */
  closeClickHandler(e) {
    if (e.target.className === "maximised shown") this.hideMaximised();
  }
}

/**
 * Class to manage the UI of the host page.
 * This includes zooming in and out of the boards as well as other buttons.
 */
class HostUI {
  zoomLevel: number;
  whiteboards: HTMLDivElement;

  constructor() {
    this.zoomLevel = 3;
    this.whiteboards = document.querySelector("div.whiteboards");
  }

  /**
   * Sets the zoom level to the specified number.
   * Does not validate, this must be done in `zoomIn()` and `zoomOut()`.
   * @param {Number} zoomLevel - the zoom level to set
   */
  setZoomLevel(zoomLevel: number) {
    this.zoomLevel = zoomLevel;
    this.whiteboards.className = `whiteboards zoom${zoomLevel}`;
  }

  zoomIn() { if (this.zoomLevel < 4) this.setZoomLevel(this.zoomLevel + 1); }
  zoomOut() { if (this.zoomLevel > 1) this.setZoomLevel(this.zoomLevel - 1); }
}