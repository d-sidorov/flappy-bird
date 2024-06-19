const IMAGE_ASSETS_PATH = {
  "background-day": "/assets/objects/background-day.png",
  base: "/assets/objects/base.png",
  "pipe-down": "/assets/objects/pipe-down.png",
  "pipe-up": "/assets/objects/pipe-up.png",
  "yellowbird-downflap": "/assets/objects/yellowbird-downflap.png",
  "yellowbird-midflap": "/assets/objects/yellowbird-midflap.png",
  "yellowbird-upflap": "/assets/objects/yellowbird-upflap.png",
  gameover: "/assets/UI/gameover.png",
  message: "/assets/UI/message.png",
  "number-0": "/assets/UI/Numbers/0.png",
  "number-1": "/assets/UI/Numbers/1.png",
  "number-2": "/assets/UI/Numbers/2.png",
  "number-3": "/assets/UI/Numbers/3.png",
  "number-4": "/assets/UI/Numbers/4.png",
  "number-5": "/assets/UI/Numbers/5.png",
  "number-6": "/assets/UI/Numbers/6.png",
  "number-7": "/assets/UI/Numbers/7.png",
  "number-8": "/assets/UI/Numbers/8.png",
  "number-9": "/assets/UI/Numbers/9.png",
};
const AUDIO_ASSETS_PATH = {
  die: "/assets/sounds/die.ogg",
  hit: "/assets/sounds/hit.ogg",
  point: "/assets/sounds/point.ogg",
  swoosh: "/assets/sounds/swoosh.ogg",
  wing: "/assets/sounds/wing.ogg",
};
const GRAVITY = 2.15;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const TUBE_START_X = 250;
const TUBE_WIDTH = 52;
const TUBER_INTERVAL = 150;
const TUBE_WINDOW = 130;
const GAME_SPEED = 1;

interface IBird {
  x: number;
  y: number;
  assetIndex: number;
  animationId?: number | null;
}

interface ITube {
  x: number;
  y: number;
}

type IGroundBlock = ITube;

class Game {
  private height: number;
  private width: number;
  private ctx: CanvasRenderingContext2D;
  private imgAssets: Partial<Record<keyof typeof IMAGE_ASSETS_PATH, HTMLImageElement>> = {};
  private audioAssets: Partial<Record<keyof typeof AUDIO_ASSETS_PATH, HTMLAudioElement>> = {};
  private bird: IBird | null = null;
  private speed = 0;
  private tubes: ITube[] = [];
  private nextTube: ITube | null = null;
  private count = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.jump = this.jump.bind(this);

    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    document.body.appendChild(canvas);
  }

  async init() {
    await this.loadImageAssets();
    await this.loadAudioAssets();
    this.renderWorld();
    this.renderMenu();
    this.renderGround();
  }

  private async loadImageAssets() {
    return await new Promise((resolve) => {
      Object.entries(IMAGE_ASSETS_PATH).forEach(([key, path]) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
          this.imgAssets[key as keyof typeof IMAGE_ASSETS_PATH] = img;
          if (Object.keys(this.imgAssets).length === Object.keys(IMAGE_ASSETS_PATH).length) resolve(true);
        };
      });
    });
  }

  private loadAudioAssets() {
    Object.entries(AUDIO_ASSETS_PATH).forEach(([key, path]) => {
      let audioInstance = new Audio(path);
      audioInstance.preload = "auto";
      this.audioAssets[key as keyof typeof AUDIO_ASSETS_PATH] = audioInstance;
    });
  }

  private get birdAssets() {
    return [
      this.imgAssets["yellowbird-downflap"],
      this.imgAssets["yellowbird-midflap"],
      this.imgAssets["yellowbird-upflap"],
    ];
  }

  private get groundHeight() {
    const base = this.imgAssets.base as HTMLImageElement;
    return base.height;
  }

  private renderWorld() {
    this.renderGround();
    this.renderBackground();
  }

  private renderMenu(gameOver: boolean = false) {
    const menuImg = this.imgAssets[gameOver ? "gameover" : "message"] as HTMLImageElement;

    this.ctx.drawImage(
      menuImg,
      this.ctx.canvas.width / 2 - menuImg.width / 2,
      this.ctx.canvas.height / 2 - menuImg.height / 2
    );

    const play = () => {
      this.playSoundEffect("swoosh");
      this.ctx.canvas.removeEventListener("click", play);
      this.play();
    };

    setTimeout(() => this.ctx.canvas.addEventListener("click", play), gameOver ? 300 : 0);
  }

  private renderGround() {
    const base = this.imgAssets["base"] as HTMLImageElement;
    const count = Math.ceil(this.width / base.width);
    for (let i = 0; i < count; i++) {
      const x = base.width * i;
      const y = this.height - base.height;
      this.ctx?.drawImage(base, x, y);
    }
  }

  private renderBackground() {
    const background = this.imgAssets["background-day"] as HTMLImageElement;
    let backgroundWidth = background.width;
    const count = Math.ceil(this.width / backgroundWidth);
    for (let i = 0; i < count; i++) {
      this.ctx?.drawImage(background, backgroundWidth * i, this.height - background.height - this.groundHeight);
    }
  }

  private createBird() {
    this.bird = {
      x: 40,
      y: (this.ctx.canvas.height - this.groundHeight) / 2,
      assetIndex: 0,
    };

    this.bird.animationId = setInterval(() => {
      if (!this.bird) return;

      this.bird.assetIndex++;
      if (this.bird?.assetIndex > this.birdAssets.length - 1) this.bird.assetIndex = 0;
      this.renderBird();
    }, 150);
  }

  private renderBird() {
    if (!this.bird) return;

    const birdAssets = this.birdAssets;
    const img = birdAssets[this.bird.assetIndex || 0] as HTMLImageElement;
    this.ctx.drawImage(img, this.bird.x, this.bird.y);
  }

  private updateBirdPosition() {
    if (!this.bird) return;
    this.bird.y = this.bird.y + GRAVITY + this.speed;
  }

  private createTubes() {
    const availableLength = this.ctx.canvas.width - BIRD_WIDTH - TUBER_INTERVAL;
    const tubesCount = Math.ceil(availableLength / (TUBE_WIDTH + TUBER_INTERVAL));

    for (let i = 0; i < tubesCount; i++) {
      const x = (TUBER_INTERVAL + TUBE_WIDTH) * i + TUBE_START_X;
      this.createTube(x);
    }
  }
  private createTube(x: number) {
    const min = 50;
    const max = this.height - this.groundHeight - 170;

    const y = Math.floor(Math.random() * (max - min + 1) + min);
    const tube: ITube = { x, y };
    this.tubes.push(tube);
  }
  private updateTubes() {
    const lastTube = this.tubes[this.tubes.length - 1];
    if (this.width - lastTube.x > TUBER_INTERVAL + TUBE_WIDTH) this.createTube(this.width);

    this.tubes = this.tubes.filter((tube) => tube.x + TUBE_WIDTH > 0);
  }
  private moveTubes() {
    this.tubes.forEach((tube) => (tube.x -= GAME_SPEED));
  }
  private renderTubes() {
    const pipeDown = this.imgAssets["pipe-down"] as HTMLImageElement;
    const pipeUp = this.imgAssets["pipe-up"] as HTMLImageElement;

    this.tubes.forEach((tube) => {
      this.ctx.drawImage(pipeDown, tube.x, tube.y - pipeDown.height);
      this.ctx.drawImage(pipeUp, tube.x, tube.y + TUBE_WINDOW);
    });
  }

  private updateCount() {
    const nextTube = this.tubes.find((tube) => {
      return tube.x > (this.bird?.x || 0);
    }) as ITube;

    if (this.nextTube !== nextTube) {
      this.count++;
      this.nextTube = nextTube;
      this.playSoundEffect("point");
    }
  }

  private renderCount() {
    const digits = String(this.count);
    digits
      .split("")
      .reverse()
      .forEach((digit, index) => {
        const digitImg = this.imgAssets[`number-${digit}` as keyof typeof IMAGE_ASSETS_PATH] as HTMLImageElement;
        this.ctx.drawImage(digitImg, this.width - 24 * (index + 1) - 20, 10);
      });
  }

  private checkIsLose() {
    if (!this.bird) return false;

    if (this.bird?.y + BIRD_HEIGHT > this.height - this.groundHeight || this.bird.y < 0) return true;

    const firstTube = this.tubes[0];
    if (this.bird.x + BIRD_WIDTH - 5 < firstTube.x || this.bird.x + 5 > firstTube.x + TUBE_WIDTH) return false;

    return this.bird.y <= firstTube.y || this.bird.y + BIRD_HEIGHT >= firstTube.y + TUBE_WINDOW;
  }

  private play() {
    this.count = 0;

    this.renderBackground();

    this.createBird();
    this.renderBird();

    this.createTubes();
    this.renderTubes();

    this.renderGround();

    this.renderCount();

    const start = () => {
      this.fly();
      this.jump();

      this.nextTube = this.tubes[0];
      this.ctx?.canvas.removeEventListener("click", start);
      this.ctx?.canvas.addEventListener("mousedown", this.jump);
    };
    this.ctx?.canvas.addEventListener("click", start);
  }

  private fly() {
    let offset = 0;
    const animate = () => {
      this.speed += 0.05;
      offset++;

      this.renderBackground();
      this.moveTubes();
      this.updateTubes();
      this.renderTubes();
      this.renderGround();
      this.updateBirdPosition();
      this.renderBird();
      this.updateCount();
      this.renderCount();

      if (this.checkIsLose()) {
        this.playSoundEffect("hit");
        this.playSoundEffect("die");
        this.stop();
        return;
      }
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  private jump() {
    this.speed = GRAVITY * -GRAVITY;
    this.playSoundEffect("wing");
  }

  private playSoundEffect(effect: keyof typeof AUDIO_ASSETS_PATH) {
    const audioInstance = this.audioAssets[effect];
    if (!audioInstance) return;

    audioInstance.currentTime = 0;
    audioInstance.play();
  }

  private stop() {
    this.ctx.canvas.removeEventListener("mousedown", this.jump);
    this.renderMenu(true);
    this.tubes.splice(0);
    if (this.bird?.animationId) clearInterval(this.bird?.animationId);
  }
}

const game = new Game(400, 600);
game.init();
