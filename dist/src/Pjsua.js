"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const sipster_ts_1 = require("sipster.ts");
exports.Media = sipster_ts_1.Media;
//const debug = DEBUG('PJSUA:main');
const debug = console.log;
/**
 * An adapter class to Sipster.ts.Call
 * @see {@link https://minoruta.github.io/sipster.ts/classes/call.html|Sipster.ts.Call}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Call.htm|Pjsip.Call} as well
 * @fires CallExt#dtmf
 * @fires CallExt#disconnected
 */
class CallExt extends events_1.EventEmitter {
    get callInfo() {
        return this._call.callInfo;
    }
    get call() {
        return this._call;
    }
    get account() {
        return this._account;
    }
    get medias() {
        return this._medias;
    }
    set medias(medias) {
        this._medias = medias;
    }
    get player() {
        return this._player;
    }
    get recorder() {
        return this._recorder;
    }
    onConnecting() {
        debug('AccountExt.onConnecting');
    }
    constructor(account, call, playerConfig) {
        super();
        this._account = account;
        this._call = call;
        call.on('dtmf', digit => this.onDtmf(digit));
        call.on('media', medias => this.onMedia(medias));
        call.on('state', state => {
            switch (state) {
                case 'connecting':
                    return this.onConnecting();
                case 'confirmed':
                    return this.onConfirmed();
                case 'disconnected':
                    console.log("call on state disconnected");
                    call.removeAllListeners();
                    return this.onDisconnected();
            }
        });
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = account.playerConfig;
        if (this._playerConfig.player) {
            this._player = sipster_ts_1.Sipster.instance().createPlayer(); //this._playerConfig.player.filename
            this._player.on('playerStatus', (songPath, type, param) => {
                console.log("CallExt::playerStatus, song:" + songPath + ",type" + type + ",param" + param);
                this.emit('playerStatus', songPath, type, param);
            });
        }
        if (this._playerConfig.recorder)
            this._recorder = sipster_ts_1.Sipster.instance()
                .createRecorder(this._playerConfig.recorder.filename);
    }
    onConfirmed() {
        console.log('CallExt.onConfirmed');
    }
    onDtmf(digit) {
        console.log(`CallExt.onDtmf ${digit}`);
        this.emit('dtmf', digit);
    }
    onDisconnected() {
        console.log('CallExt.onDisconnected');
        if (this.medias) {
            for (const media of this.medias) {
                media.close();
            }
        }
        if (this._player) {
            this._player.close();
        }
        this.emit('disconnected');
    }
    onMedia(medias) {
        console.log(`CallExt.onMedia ${medias.length}`);
        if (medias.length <= 0)
            return;
        if (this.player) {
            let status = medias[0].status;
            console.log("Media status" + status);
            if (status === "active") {
                if (this._playerConfig.player) {
                    console.log("CallExt::onMedia, Play " + this._playerConfig.player.filename);
                    this.player.playSong(this._playerConfig.player.filename);
                }
                this.player.startTransmitTo(medias[0]);
            }
            else if (status === "localHold" || status === "remoteHold") {
                this.player.stopTransmitTo(medias[0]);
            }
        }
        if (this.recorder)
            medias[0].startTransmitTo(this.recorder);
        this.medias = medias;
    }
    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(statusCode, reason) {
        console.log('CallExt.answer');
        this.call.answer(statusCode, reason);
    }
    /**
 * Hangs up the call with an optional statusCode (defaults to 603)
 * and optional reason phrase. This function is different than answering
 * the call with 3xx-6xx response (with answer()), in that this function
 * will hangup the call regardless of the state and role of the call,
 * while answer() only works with incoming calls on EARLY state.
 */
    hangup(statusCode, reason) {
        console.log('CallExt.hangup');
        return new Promise((resolve, reject) => {
            this.call.removeAllListeners();
            this.call.on('state', (state) => {
                debug('AccountExt.hangup.call', state);
                switch (state) {
                    case 'disconnected':
                        console.log("call on hangup disconnected");
                        this.call.removeAllListeners();
                        this.onDisconnected();
                        return resolve();
                }
            });
            if (this.medias && this.medias.length > 0) {
                if (this.player)
                    this.player.stopTransmitTo(this.medias[0]);
                if (this.recorder)
                    this.medias[0].stopTransmitTo(this.recorder);
            }
            this.call.hangup(statusCode, reason);
        });
    }
    playSong(songPath) {
        if (this.player) {
            console.log("CallExt::playSong, Play song " + songPath);
            this._playerConfig.player.filename = songPath;
            this.player.playSong(songPath);
        }
    }
}
exports.CallExt = CallExt;
/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires BuddyExt#stateChanged
 */
class BuddyExt extends events_1.EventEmitter {
    get state() {
        return "offline";
    }
    get buddy() {
        return this._buddy;
    }
    constructor(buddy) {
        super();
        this._buddy = buddy;
        this._buddy.on('buddyStatus', (uri, stateText) => this.onBuddyState(uri, stateText));
    }
    onBuddyState(uri, stateText) {
        debug('BuddyExt.onBuddyState, from:' + uri + ", stateText:" + stateText);
        this.emit('buddyState', uri, stateText);
    }
    sendInstantMessage(message) {
        debug('BuddyExt.answer');
        this._buddy.sendInstantMessage(message);
    }
    subscribePresence(subscribe) {
        debug("BuddyExt subscribePresence");
        this.buddy.subscribePresence(subscribe);
    }
}
exports.BuddyExt = BuddyExt;
/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires AccountExt#registering
 * @fires AccountExt#unregistering
 * @fires AccountExt#unregistererd
 * @fires AccountExt#call
 */
class AccountExt extends events_1.EventEmitter {
    //private _call?: CallExt;
    get account() {
        return this._account;
    }
    /*
        get isCallInProgress(): boolean {
            return !!this._call;
        }
        get call(): CallExt {
            return this._call;
        }
    */
    get playerConfig() {
        return this._playerConfig;
    }
    get state() {
        return this._state;
    }
    set state(state) {
        this._state = state;
    }
    constructor(ua, account, playerConfig) {
        super();
        this._ua = ua;
        this._account = account;
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = ua.playerConfig;
        this._state = "registered";
    }
    onRegistering() {
        debug('AccountExt.onRegistering');
        this.state = 'registering';
        this.emit('registering');
    }
    onRegistered() {
        debug('AccountExt.onRegistered');
        this.state = 'registered';
    }
    onUnregistering() {
        debug('AccountExt.onUnregistering');
        this.state = 'unregistering';
        this.emit('unregistering');
    }
    onUnregistered() {
        debug('AccountExt.onUnregistered');
        this.state = 'unregistererd';
        this.emit('unregistererd');
    }
    onCall(info, call) {
        debug('AccountExt.onCall');
        //if (this.isCallInProgress)
        //    return call.hangup();
        this.emit('call', info, new CallExt(this, call));
    }
    onInstantMessage(fromUri, msg) {
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
    makeCall(destination, param, audioDeviceId, playerConfig) {
        debug('AccountExt.makeCall, des:' + destination + ", playerConfig:" + playerConfig);
        return new Promise((resolve, reject) => {
            if (this.state !== 'registered')
                return reject(new Error('not registered'));
            //if (this.isCallInProgress)
            //    return reject(new Error('call in progress'));
            /*
            let isAuto = true;
            if (playerConfig) {
                isAuto = false;
            }
            */
            if (audioDeviceId) {
                console.log("Use device:" + audioDeviceId + " to record");
            }
            const call = this.account.makeCall(destination, param, audioDeviceId);
            const callExt = new CallExt(this, call, playerConfig);
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
    setRegistration(renew) {
        debug('AccountExt.setRegistration', renew);
        this.account.setRegistration(renew);
    }
    addBuddy(buddyUri, subscribePresence = false) {
        let buddy = new BuddyExt(this.account.addBuddy(buddyUri, subscribePresence));
        return buddy;
    }
    delBuddy(buddyUri) {
        this.account.delBuddy(buddyUri);
    }
}
exports.AccountExt = AccountExt;
/**
 * A simple Pjsua2 which provides player to playback and record
 */
class Pjsua {
    get sipster() {
        return this._sipster;
    }
    get account() {
        return this._account;
    }
    get playerConfig() {
        return this._playerConfig;
    }
    constructor(config) {
        this._playerConfig = config.player;
        this._sipster = sipster_ts_1.Sipster.instance(config.endpoint);
        this._transport = new this.sipster.Transport(config.transport);
    }
    onRegistered() {
        debug('Pjsua.onRegistered');
        if (this.account)
            this.account.onRegistered();
    }
    onRegistering() {
        debug('Pjsua.onRegistering');
        if (this.account)
            this.account.onRegistering();
    }
    onUnregistering() {
        debug('Pjsua.onUnregistering');
        if (this.account)
            this.account.onUnregistering();
    }
    onUnregistered() {
        debug('Pjsua.onUnregistered');
        if (this.account)
            this.account.onUnregistered();
    }
    onCall(info, call) {
        debug('Pjsua.onCall');
        if (this.account)
            this.account.onCall(info, call);
    }
    onInstantMessage(fromUri, msg) {
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
    makeAccount(accountConfig) {
        debug('Pjsua.makeAccount');
        return new Promise((resolve, reject) => {
            let account;
            accountConfig.sipConfig.transport = this._transport;
            accountConfig = sipster_ts_1.makeAccountConfig(accountConfig);
            if (this.account) {
                account = this.account.account;
                account.modify(accountConfig);
            }
            else {
                account = new this.sipster.Account(accountConfig);
                this._account = new AccountExt(this, account);
            }
            account.on('state', (active, statusCode) => {
                if (statusCode == 408) {
                    account.removeAllListeners();
                    reject(new Error('timeout'));
                }
            });
            account.on('call', (info, call) => this.onCall(info, call));
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
            account.on('instantMessage', (fromUri, msg) => this.onInstantMessage(fromUri, msg));
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
    removeAccount() {
        debug('Pjsua.removeAccount');
        return new Promise((resolve, reject) => {
            if (!this.account)
                return reject(new Error('no account'));
            //if (this.account.isCallInProgress)
            //    return reject(new Error('call in progress'));
            if (this.account.state === 'unregistered')
                return resolve(); // noop
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
    createPlayer(filename) {
        let player = sipster_ts_1.Sipster.instance().createPlayer();
        player.playSong(filename);
        return player;
    }
    createRecorder(filename) {
        return sipster_ts_1.Sipster.instance().createRecorder(filename);
    }
    enumDevs() {
        return this._sipster.enumDevs;
    }
}
exports.Pjsua = Pjsua;
//# sourceMappingURL=Pjsua.js.map