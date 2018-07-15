import * as DEBUG from 'debug';
import { EventEmitter } from 'events';
import {
    Sipster,
    TransportConfig,
    EpConfig,
    AccountConfig,
    Call,
    CallInfo,
    Account,
    AudioMediaPlayer,
    AudioMediaRecorder,
    Media,
    makeAccountConfig,
    Buddy,
    AudioDevInfo,
    SipPlatform
} from 'sipster.ts';

export {
    TransportConfig,
    EpConfig,
    AccountConfig,
    CallInfo,
    Media,
    AudioMediaPlayer,
    AudioMediaRecorder,
    SipPlatform
};

const debug = DEBUG('PJSUA:main');

export interface PlayerConfig {
    player?: {
        /** filename to play while calling */
        filename: string;
    };
    recorder?: {
        /** filename to record while calling */
        filename: string;
    };
}

export interface PjsuaConfigs {
    /**
     * @see {@link https://minoruta.github.io/sipster.ts/interfaces/transportconfig.html|Sipster.ts.TransportConfig}
     * @see {@link http://www.pjsip.org/pjsip/docs/html/structpj_1_1TransportConfig.htm|Pjsip.TransportConfig}
     */
    transport: TransportConfig;
    /**
     * @see {@link https://minoruta.github.io/sipster.ts/interfaces/epconfig.html|Sipster.ts.EpConfig}
     * @see {@link http://www.pjsip.org/pjsip/docs/html/structpj_1_1EpConfig.htm|Pjsip.EpConfig}
     */
    endpoint: EpConfig;
    player: PlayerConfig;
}

/**
 * An adapter class to Sipster.ts.Call
 * @see {@link https://minoruta.github.io/sipster.ts/classes/call.html|Sipster.ts.Call}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Call.htm|Pjsip.Call} as well
 * @fires CallExt#dtmf
 * @fires CallExt#disconnected
 */
export class CallExt extends EventEmitter {
    private readonly _call: Call;
    private readonly _account: AccountExt;
    // private readonly _playerConfig: PlayerConfig;
    // private readonly _player?: AudioMediaPlayer;
    // private readonly _recorder?: AudioMediaRecorder;
    // private _medias?: Media[];

    get callInfo(): CallInfo {
        return this._call.callInfo;
    }

    get call(): Call {
        return this._call;
    }

    protected get account(): AccountExt {
        return this._account;
    }

    /*
    get medias(): Media[] {
        return this._medias;
    }
    set medias(medias: Media[]) {
        this._medias = medias;
    }
    */
    /*
    protected get player(): AudioMediaPlayer {
        return this._player;
    }

    protected get recorder(): AudioMediaRecorder {
        return this._recorder;
    }
    */

    protected onConnecting(): void {
        debug('AccountExt.onConnecting');
    }

    constructor(account: AccountExt, call: Call, playerConfig?: PlayerConfig) {
        super();
        this._account = account;
        this._call = call;

        call.on('dtmf', digit => this.onDtmf(digit));
        call.on('media', medias => this.onMedia(medias));
        call.on('state', (state: string, lastStatusCode: number) => {
            switch (state) {
                case 'connecting':
                    return this.onConnecting();
                case 'confirmed':
                    return this.onConfirmed();
                case 'disconnected':
                    console.log("call on state disconnected");
                    call.removeAllListeners();
                    return this.onDisconnected(lastStatusCode);
            }

        call.on('playerStatus', (songPath: string, type: number, param: number) => {
                // console.log("CallExt::playerStatus, song:" + songPath + ",type" + type + ",param" + param);
                this.emit('playerStatus', songPath, type, param);
            });
        });

        /*
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = account.playerConfig;

        if (this._playerConfig.player) {
            // this._playerConfig.player.filename
            this._player = Sipster.instance().createPlayer();

            this._player.on('playerStatus', (songPath: string, type: number, param: number) => {
                // console.log("CallExt::playerStatus, song:" + songPath + ",type" + type + ",param" + param);
                this.emit('playerStatus', songPath, type, param);
            });
        }

        if (this._playerConfig.recorder)
            this._recorder = Sipster.instance()
                .createRecorder(this._playerConfig.recorder.filename);
        */
    }

    onConfirmed(): void {
        console.log('CallExt.onConfirmed');
    }
    onDtmf(digit: string): void {
        console.log(`CallExt.onDtmf ${digit}`);
        this.emit('dtmf', digit);
    }
    onDisconnected(lastStatusCode: number): void {
        console.log('CallExt.onDisconnected');
        /*
        if (this.medias) {
            for (const media of this.medias) {
                media.close();
            }
        }

        if (this._player) {
            this._player.close();
        }
        */
        this.emit('disconnected', lastStatusCode);
    }

    onMedia(medias: Media[]): void {
        console.log(`CallExt.onMedia ${medias.length}`);
        if (medias.length <= 0)
            return;

        /*
        if (this.player) {
            if (this._playerConfig.player) {
                console.log("CallExt::onMedia, Play " + this._playerConfig.player.filename);
                // this.player.playSong(this._playerConfig.player.filename);
            }

            this.player.startTransmitTo(medias[0]);
        }

        if (this.recorder)
            (medias[0] as AudioMedia).startTransmitTo(this.recorder);
        this.medias = medias;
        */
    }

    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(statusCode?: number, reason?: string): void {
        console.log('CallExt.answer');
        this.call.answer(statusCode, reason);
    }

    hangup(statusCode?: number, reason?: string): Promise<void> {
        console.log('CallExt.hangup');
        return new Promise((resolve, reject) => {
            this.call.removeAllListeners();
            this.call.on('state', (state: string, lastStatusCode: number) => {
                debug('AccountExt.hangup.call', state);
                switch (state) {
                    case 'disconnected':
                        console.log("call on hangup disconnected");
                        this.call.removeAllListeners();
                        this.onDisconnected(lastStatusCode);
                        return resolve();
                }
            });
            /*
            if (this.medias && this.medias.length > 0) {
                if (this.player)
                    this.player.stopTransmitTo(this.medias[0]);
                if (this.recorder)
                    (this.medias[0] as AudioMedia).stopTransmitTo(this.recorder);
            }
            */
            this.call.hangup(statusCode, reason);
        });
    }

    playSong(songPath: string) {
        this.call.play(songPath);
        /*
        if (this.player) {
            console.log("CallExt::playSong, Play song " + songPath);
            this.player.playSong(songPath);
        }
        */
    }
}

/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires BuddyExt#stateChanged
 */
export class BuddyExt extends EventEmitter {
    private readonly _buddy: Buddy;

    get state(): string {
        return "offline";
    }

    get buddy(): Buddy {
        return this._buddy;
    }

    constructor(buddy: Buddy) {
        super();
        this._buddy = buddy;
        this._buddy.on('buddyStatus', (uri: string, stateText: string) => this.onBuddyState(uri, stateText));
    }

    onBuddyState(uri: string, stateText: string): void {
        debug('BuddyExt.onBuddyState, from:' + uri + ", stateText:" + stateText);

        this.emit('buddyState', uri, stateText);
    }

    sendInstantMessage(message: string): void {
        debug('BuddyExt.sendInstantMessage' + message);
        this._buddy.sendInstantMessage(message);
    }

    subscribePresence(subscribe: boolean): void {
        debug("BuddyExt subscribePresence");
        this.buddy.subscribePresence(subscribe);
    }
}

/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires AccountExt#registering
 * @fires AccountExt#unregistering
 * @fires AccountExt#unregistererd
 * @fires AccountExt#call
 */
export class AccountExt extends EventEmitter {
    private readonly _ua: Pjsua;
    private readonly _account: Account;
    private readonly _playerConfig: PlayerConfig;
    private _state: string;

    get account(): Account {
        return this._account;
    }

    get playerConfig(): PlayerConfig {
        return this._playerConfig;
    }

    get state(): string {
        return this._state;
    }
    set state(state: string) {
        this._state = state;
    }

    constructor(ua: Pjsua, account: Account, playerConfig?: PlayerConfig) {
        super();
        this._ua = ua;
        this._account = account;
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = ua.playerConfig;
        this._state = "registered";
    }

    onRegistering(): void {
        debug('AccountExt.onRegistering');
        this.state = 'registering';
        this.emit('registering');
    }
    onRegistered(): void {
        debug('AccountExt.onRegistered');
        this.state = 'registered';
    }
    onUnregistering(): void {
        debug('AccountExt.onUnregistering');
        this.state = 'unregistering';
        this.emit('unregistering');
    }
    onUnregistered(): void {
        debug('AccountExt.onUnregistered');
        this.state = 'unregistererd';
        this.emit('unregistererd');
    }
    onCall(info: CallInfo, call: Call): void {
        debug('AccountExt.onCall');
        // if (this.isCallInProgress)
        //    return call.hangup();
        this.emit('call', info, new CallExt(this, call));
    }

    onInstantMessage(fromUri: string, msg: string) {
        debug('AccountExt.onInstantMessage ${fromUri}:${msg}');
        this.emit('onInstantMessage', fromUri, msg);
    }

    /**
     * Start a new SIP call to destination.
     * @return when the outbound call has been connected.
     * @reject {Error}  not registered
     * @reject {Error}  call in progress
     * @reject {Error}  disconnected
     */
    makeCall(destination: string, param: string, audioDeviceId: number, startTonePath?: string, stopTonePath?: string): Promise<CallExt> {
        debug('AccountExt.makeCall, des:' + destination + ", startTonePath:" + startTonePath + ",stopTonePath:" + stopTonePath);
        return new Promise((resolve, reject) => {
            if (this.state !== 'registered')
                return reject(new Error('not registered'));

            const call = this.account.makeCall(destination, param, audioDeviceId, startTonePath, stopTonePath);
            const callExt = new CallExt(this, call);
            resolve(callExt);
        });
    }

    /**
     * Start a new SIP call to destination.
     * @return when the outbound call has been connected.
     * @reject {Error}  not registered
     * @reject {Error}  call in progress
     * @reject {Error}  disconnected
     */
    makeFileCall(destination: string, param?: string, playerConfig?: PlayerConfig): Promise<CallExt> {
        debug('AccountExt.makeCall, des:' + destination + ", playerConfig:" + playerConfig);
        return new Promise((resolve, reject) => {
            if (this.state !== 'registered')
                return reject(new Error('not registered'));

            const call = this.account.makeCall(destination, param, -1, playerConfig.player.filename);
            const callExt = new CallExt(this, call);
            resolve(callExt);
        });
    }

    /**
     * Update registration or perform unregistration.
     * You only need to call this method if you want to manually update the
     * registration or want to unregister from the server.
     * If renew is false, this will begin the unregistration process.
     * @param renew do 'register' to update expiration when true,
     *              do 'register' with expiration=0 to unregister when false.
     */
    setRegistration(renew: boolean): void {
        debug('AccountExt.setRegistration', renew);
        this.account.setRegistration(renew);
    }

    addBuddy(buddyUri: string, subscribePresence: boolean = false): BuddyExt {
        const buddy: BuddyExt = new BuddyExt(this.account.addBuddy(buddyUri, subscribePresence));
        return buddy;
    }

    delBuddy(buddyUri: string) {
        this.account.delBuddy(buddyUri);
    }
}

/**
 * A simple Pjsua2 which provides player to playback and record
 */
export class Pjsua {
    private readonly _sipster: Sipster;
    private _playerConfig: PlayerConfig;
    private _transport: Transport;
    private _account?: AccountExt;

    protected get sipster(): Sipster {
        return this._sipster;
    }

    get account(): AccountExt {
        return this._account;
    }

    get playerConfig(): PlayerConfig {
        return this._playerConfig;
    }

    constructor() {
        this._sipster = Sipster.instance();
    }

    initPJSip(config: PjsuaConfigs) {
        this._playerConfig = config.player;
        this._sipster.init(config.endpoint);
        this._transport = new this.sipster.Transport(config.transport);
    }

    disconnect(): Promise<any> {
        return this._sipster.disconnect();
    }

    protected onRegistered(): void {
        debug('Pjsua.onRegistered');
        if (this.account)
            this.account.onRegistered();
    }
    protected onRegistering(): void {
        debug('Pjsua.onRegistering');
        if (this.account)
            this.account.onRegistering();
    }
    protected onUnregistering(): void {
        debug('Pjsua.onUnregistering');
        if (this.account)
            this.account.onUnregistering();
    }
    protected onUnregistered(): void {
        debug('Pjsua.onUnregistered');
        if (this.account)
            this.account.onUnregistered();
    }
    protected onCall(info: CallInfo, call: Call): void {
        debug('Pjsua.onCall');
        if (this.account)
            this.account.onCall(info, call);
    }

    protected onInstantMessage(fromUri: string, msg: string) {
        debug('Pjsua.onInstantMessage');
        if (this.account)
            this.account.onInstantMessage(fromUri, msg);
    }
    /**
     * Make an account and start registration
     * @param accountConfig     is for making an acount
     * @return when the outstanding account has been registered.
     * @reject {Error}  timeout
     * @reject {Error}  unregistered
     */
    makeAccount(accountConfig: AccountConfig): Promise<void> {
        debug('Pjsua.makeAccount');
        return new Promise<void>((resolve, reject) => {
            let account: Account;
            accountConfig.sipConfig.transport = this._transport;
            accountConfig = makeAccountConfig(accountConfig);
            if (this.account) {
                account = this.account.account;
                account.modify(accountConfig);
            }
            else {
                account = new this.sipster.Account(accountConfig);
                this._account = new AccountExt(this, account);
            }

            account.on('state', (active: boolean, statusCode: number) => {
                if (statusCode == 408) {
                    account.removeAllListeners();
                    reject(new Error('timeout'));
                }
            });
            account.on('call', (info: CallInfo, call: Call) => this.onCall(info, call));
            account.on('registering', () => this.onRegistering());
            account.on('unregistering', () => this.onUnregistering());
            account.on('unregistered', () => {
                this.onUnregistered();
                account.removeAllListeners();
                reject(new Error('unregistered'));
            });
            account.once('registered', () => {
                this.onRegistered();
                resolve();
            });

            account.on('instantMessage', (fromUri: string, msg: string) => this.onInstantMessage(fromUri, msg));
            if (this.sipster.state === 'init')
                this.sipster.start();
        });
    }

    /**
     * Delete an account and the registration
     * @return when the current account has been unregistered.
     * @reject {Error}  no account
     * @reject {Error}  call in progress
     * @reject {Error}  not registered
     */
    removeAccount(): Promise<void> {
        debug('Pjsua.removeAccount');
        return new Promise<void>((resolve, reject) => {
            if (!this.account)
                return reject(new Error('no account'));
            // if (this.account.isCallInProgress)
            //    return reject(new Error('call in progress'));
            if (this.account.state === 'unregistered')
                return resolve();   // noop
            if (this.account.state !== 'registered')
                return reject(new Error(`not registered, \"${this.account.state}\"`));

            this.account.account.removeAllListeners();
            this.account.account.on('unregistered', () => {
                this.account.account.removeAllListeners();
                this.account.onUnregistered();
                resolve();
            });
            this.account.setRegistration(false);
        });
    }

    /*
    startLocalRecord(filename: string): boolean {
        return Sipster.instance().startLocalRecord(filename);
    }

    stopLocalRecord(): boolean {
        return Sipster.instance().stopLocalRecord();
    }

    startLocalPlay(filename: string): boolean {
        return Sipster.instance().startLocalPlay(filename);
    }

    stopLocalPlay(): boolean {
        return Sipster.instance().stopLocalPlay();
    }
    */

    createPlayer(filename: string): AudioMediaPlayer {
        console.log("Create local player, file:" + filename);
        const player: AudioMediaPlayer = Sipster.instance().createPlayer(filename);
        // player.playSong(filename);
        return player;
    }

    createRecorder(filename: string): AudioMediaRecorder {
        return Sipster.instance().createRecorder(filename);
    }

    enumDevs(): Array<AudioDevInfo> {
        return this._sipster.enumDevs;
    }

    codecEnum(): Array<string> {
        return this._sipster.codecEnum;
    }
    setCodecPriority(codecId: string, priority:number): void {
        this._sipster.setCodecPriority(codecId, priority);
    }
}

export class SipSystemExt extends EventEmitter {
    private readonly _sipster: Sipster;
    private _sipSystem: SipPlatform;
    constructor() {
        super();
        this._sipster = Sipster.instance();

        this._sipSystem = this.sipster.systemInit();
        this._sipSystem.on("systemStatus", (state: string) => {
            console.log("System state changed:" + state);
            this.emit("systemStatus", state);
        });
    }

    protected get sipster(): Sipster {
        return this._sipster;
    }

    init(): void {
        this._sipSystem.init();
    }

    verifyDog(): boolean {
        return this._sipSystem.verifyDog;
    }
}