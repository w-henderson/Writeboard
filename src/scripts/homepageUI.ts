var Swal: any;
var firebase: FirebaseNamespace;

/** Variable to hold all the class instances to prevent cluttering up globals. */
let _wb_home: {
  UI?: HomepageUI
} = {};

/** Initialises the homepage UI manager. */
function initHome() {
  _wb_home.UI = new HomepageUI();
}

window.onload = initHome;

/**
 * Class to manage the homepage UI.
 * This involves scrolling to anchors as well as room management.
 */
class HomepageUI {
  database: FirebaseDatabase;

  constructor() {
    this.database = firebase.database();
    this.updateSizing();
    this.updateLatestUpdates();
    window.onresize = () => { _wb_home.UI.updateSizing(); };
  }

  /**
   * Netlify's asset optimisation means the user doesn't need the `.html` at the end of the URL.
   * On my local development server, I do need this.
   * This is basically a janky workaround.
   */
  route(r: string) {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "192.168.1.1") return r;
    else return `${r}.html`;
  }

  /** Scrolls smoothly to an anchor on the page and updates the URL without reloading. */
  scrollToAnchor(name: string) {
    document.querySelector(".navigation").className = "navigation";
    document.querySelector(`a[name="${name}"]`).scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, null, `#${name}`);
  }

  /** Starts and manages the join room flow with `sweetalert2`. */
  joinRoom() {
    Swal.fire({
      title: 'Enter the room ID.',
      text: "Ask the room host if you don't know the room ID.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Join',
      background: "var(--background)",
      showLoaderOnConfirm: true,
      allowOutsideClick: true,
      preConfirm: async (id: string) => {
        let regex = new RegExp("^[a-zA-Z]{6}$")
        if (!regex.test(id)) {
          Swal.showValidationMessage("Room ID should be six letters.");
          return false;
        } else {
          let valid = "invalid";
          await this.database.ref(`rooms/${id.toUpperCase()}`).once("value", (snapshot) => {
            if (snapshot.val() !== null) {
              if (snapshot.val().authLevel === 0) {
                valid = "valid";
              } else {
                valid = "locked";
              }
            }
          });

          if (valid === "invalid") Swal.showValidationMessage("Room cannot be found.");
          if (valid === "locked") Swal.showValidationMessage("Room is locked.");
          return valid === "valid" ? id.toUpperCase() : false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        let roomId = result.value;
        window.location.href = `/${this.route("client")}?${roomId}`;
      }
    });
  }

  /** Starts and manages the host room flow with `sweetalert2`. */
  async hostRoom() {
    Swal.fire({
      title: 'Name your room.',
      text: "This will appear at the top of your screen along with the room code.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Create',
      background: "var(--background)",
      allowOutsideClick: true,
      preConfirm: (name: string) => {
        if (name.length === 0) {
          Swal.showValidationMessage("You must name your room!");
          return false;
        } else {
          return name;
        }
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        let roomName = result.value;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let valid = false;

        let code = "";
        for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];

        // sketchy room ID generation
        while (!valid) {
          await this.database.ref(`rooms/${code}`).once("value", (snapshot) => {
            if (snapshot.val() === null) {
              valid = true;
            } else {
              code = "";
              for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];
            }
          });
        }

        /**
         * Auth levels are as follows:
         * 
         * 0 - no authentication at all, public
         * 1 - waiting room, **not implemented**
         * 2 - requires login, **not implemented**
         * 3 - requires login and waiting room, **not implemented**
         * 4 - locked completely, nobody new can join
         */
        this.database.ref(`rooms/${code}`).set({
          name: roomName,
          authLevel: 0,
          users: {}
        }).then(() => {
          window.localStorage.setItem("writeboardTempId", code);
          window.location.href = "/" + this.route("host");
        }).catch(() => {
          Swal.fire({
            title: "An error occurred.",
            icon: "error",
            background: "var(--background)"
          });
        });
      }
    });
  }

  /** Shows the privacy policy. */
  privacy() {
    Swal.fire({
      icon: "info",
      width: 800,
      title: "Our Privacy Policy",
      html: `Here at Writeboard, we're committed to your privacy, which is why this privacy policy aims to be as transparent as possible.
      All the data we collect is for the sole purpose of improving Writeboard, and we never share any data with any third parties.
      <h2>What data do we collect?</h2>
        <ul>
          <li>Device information such as OS, model etc</li>
          <li>Browser information such as name, version, screen resolution etc</li>
          <li>Mode of input such as pen, touch, mouse etc</li>
          <li>When and how often you create, join, leave, or close a room</li>
          <li>Vague location estimated by Google, not personally identifiable</li>
        </ul>
      <h2>What data don't we collect?</h2>
      <ul>
        <li>Any personally-identifiable data</li>
        <li>IP addresses</li>
      </ul>`,
      confirmButtonText: "Close",
      background: "var(--background)"
    })
  }

  /**
   * Updates the sizing of the screenshots for different devices.
   * This is done with some very random-looking line equation which I calculated.
   */
  updateSizing() {
    let height = (window.visualViewport.width * 0.176) + 170; // it works, don't mess it up
    (<HTMLDivElement>document.querySelector("div.banner")).style.height = `${height}px`;
    document.querySelectorAll("div.banner img").forEach((div) => {
      (<HTMLDivElement>div).style.height = `${height}px`;
      (<HTMLDivElement>div).style.left = `calc(50% - ${height * 2}px)`;
    });
  }

  /**
   * Updates the "Latest Updates" section of the homepage.
   * This queries the GitHub API to get the latest commits.
   * These are then formatted and put into the HTML list.
   */
  updateLatestUpdates() {
    let updateList: HTMLUListElement = document.querySelector("#updateList");

    window.fetch("https://api.github.com/repos/w-henderson/Writeboard/commits")
      .then(data => {
        if (data.ok) return data.json();
        else {
          updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
          firebase.analytics().logEvent("latestUpdatesError", { "errorType": "404" });
          return false;
        }
      })
      .then(data => {
        if (!data) return;
        updateList.innerHTML = "";

        for (let commit of data) {
          let commitMessage: string = commit.commit.message;
          if (commitMessage.substr(0, 20) === "Merge pull request #") continue; // Ignore merge commits
          else commitMessage = commitMessage.split("\n")[0];

          let commitDate = new Date(commit.commit.author.date);
          let commitDateString = commitDate.toLocaleDateString() + ": ";

          let li = document.createElement("li");
          let a = document.createElement("a");
          let date = document.createTextNode(commitDateString);
          a.href = commit.html_url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = commitMessage;
          li.appendChild(date);
          li.appendChild(a);
          updateList.appendChild(li);

          if (updateList.childElementCount === 5) return;
        }
      })
      .catch((e) => {
        updateList.innerHTML = "<li>An error occurred. This has been automatically reported to us, so we'll work on fixing it right away!</li>";
        firebase.analytics().logEvent("latestUpdatesError", { errorType: "unknown" });
      });
  }
}