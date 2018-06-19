import { QWebChannel } from "./qwebchannel";
import { rejects } from "assert";

var g_qtPjsip: any;
var g_qtSipAccount: Account;
var g_qtDatabase: any;
var g_qtFileSystem: any;

var SUCCEED:string = "OK";

var qtWebChannel = new QWebChannel(qt.webChannelTransport, function (channel: any) {
    console.log("Run on QWebChannel create");
    g_qtDatabase = channel.objects.database;

    g_qtPjsip = channel.objects.pjsip;
    g_qtSipAccount = new Account(g_qtPjsip.account);

    g_qtFileSystem = channel.objects.fileSystem;
});

export class QtFile {
    openFileDialog(): Promise<Array<string>> {
        return new Promise((resolve, reject) => {
            g_qtFileSystem.openFileDialog(function (files: Array<string>) {
                if (files) {
                    resolve(files);
                } else {
                    resolve(new Array<string>());
                }
            });
        })
    }
}

export class QtDatabase {
    private qtSipDatabase: any;

    constructor() {
        console.log("constructor database from pjsua");
        this.qtSipDatabase = g_qtDatabase;
    }

    init(): Promise<boolean> {
        console.log("Init database from pjsua");
        return new Promise((resolve) => {
            this.qtSipDatabase.init((result: boolean) => {
                resolve(result);
            });
        })
    }
}

export class Buddy {
    private qtSipBuddy: any;
    constructor(buddy: any) {
        this.qtSipBuddy = buddy;
    }

    sendInstantMessage(message: string) {
        this.qtSipBuddy.sendInstantMessage(message);
    }
}

export interface CallInfo {
    id:string;
    state:number
}

var g_sipCallList:Map<string, Call> = new Map<string, Call>();

export class Call {
    protected qtSipCall: any;
    protected account: Account;
    protected callIdString:string;

    onStateChanged: (state: number) => void = null;
    constructor(account: Account, call: any) {
        this.account = account;
        this.qtSipCall = call;

        this.qtSipCall.getCallId((id:string) => {
            console.log("Get Call Id:" + id);
            this.callIdString = id;
            g_sipCallList.set(id, this);
        });

        this.qtSipCall.callStateChanged.connect(this.callStateChangedSlot);
    }

    private callStateChangedSlot(callInfo: CallInfo) {
        console.log("call state, id" + callInfo.id + ",state:" + callInfo.state);
        if (g_sipCallList.has(callInfo.id)) {
            let call:Call = g_sipCallList.get(callInfo.id);
            if (call.onStateChanged) {
                console.log("send call state to sip service");
                call.onStateChanged(callInfo.state);
            }
        }
    }

    getCallId():Promise<string> {
        return new Promise(resolve => {
            resolve(this.callIdString);
        })
    }

    hangup():Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.qtSipCall.hangup((result:string) => {
                if (result === SUCCEED) {
                    if (g_sipCallList.has(this.callIdString)) {
                        g_sipCallList.delete(this.callIdString);
                    }
                    resolve(true);
                } else {
                    reject(result);
                }
            });
        })
    }
}

export class FileCall extends Call {
    onPlayStateChanged: (songPath: string, type:number, param:number) => void = null;

    constructor(account: Account, call: any) {
        super(account, call);

        this.qtSipCall.playState.connect(this.playStateChangedSlot);
    }

    private playStateChangedSlot(callIdString:string, songPath: string, type:number, param:number) {
        if (g_sipCallList.has(callIdString)) {
            let call:FileCall = <FileCall>g_sipCallList.get(callIdString);
            if (call.onPlayStateChanged) {
                call.onPlayStateChanged(songPath, type, param);
            }
        }
    }

    play(songPath:string):Promise<boolean> {
        return new Promise((resolve, rejects) => {
            this.qtSipCall.play(songPath, (result:string) => {
                if (result == SUCCEED) {
                    resolve(true);
                }
                else {
                    rejects("Play " + songPath + " fail");
                }
            })
        })
    }
}

export enum AccountState { OFFLINE, REGISTING, REGISTED };

/** @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Account} */
export class Account { // 
    private qtSipAccount: any;
    private state: AccountState = AccountState.OFFLINE;

    onStateChanged: (state: AccountState, stateCode?: number) => void;
    onInstantMessage: (fromUri: string, message: string) => void;

    constructor(account: any) {
        this.state = AccountState.OFFLINE;
        this.qtSipAccount = account;
        this.qtSipAccount.regStateChanged.connect(this.onAccountRegStateChanged);
        this.qtSipAccount.instantMessage.connect(this.instantMessageSlot);
    }

    public changeState(state: AccountState, stateCode: number = 0) {
        console.log("changed account state");
        this.state = state;
        if (this.onStateChanged) {
            this.onStateChanged(this.state, stateCode);
        }
    }

    private onAccountRegStateChanged(regIsActive: boolean, stateCode: number) {
        console.log("regIsActive:" + regIsActive + ", status code:" + stateCode);
        if (regIsActive && stateCode == 200) {
            g_qtSipAccount.changeState(AccountState.REGISTED, stateCode);
        } else {
            g_qtSipAccount.changeState(AccountState.OFFLINE, stateCode);
        }
    }

    public connect(account: string, password: string, serverIp: string): Promise<boolean> {
        return new Promise(resolve => {
            console.log("Account:" + account + ",password" + password + ",serverIp:" + serverIp);
            let self = this;
            self.qtSipAccount.connect(account, password, serverIp, function (succeed: boolean) {
                console.log("connect account " + succeed);
                if (succeed) {
                    self.changeState(AccountState.REGISTING);
                    resolve(true);
                } else {
                    this.stat = AccountState.OFFLINE;
                    resolve(false);
                }
            });
        })
    };

    logout() {
        this.qtSipAccount.logout();
    }

    public addBuddy(buddyUri: string): Promise<Buddy> {
        return new Promise((resolve, reject) => {
            let self = this;
            this.qtSipAccount.addBuddy(buddyUri, function (sipBuddy: any) {
                console.log("Sip buddy:" + sipBuddy);
                sipBuddy.isValid(function (isValid: boolean) {
                    if (isValid) {
                        console.log("Add buddy Succeed");
                        let buddy = new Buddy(sipBuddy);
                        resolve(buddy);
                    } else {
                        reject("Add buddy fail")
                    }
                })
            })
        });
    }

    public deleteBuddy(buddyUri: string): Promise<boolean> {
        return new Promise((resolve, rejects) => {
            let self = this;
            this.qtSipAccount.deleteBuddy(buddyUri);
            resolve(true);
        })
    }

    instantMessageSlot(fromUri: string, message: string) {
        console.log("Get instant message from " + fromUri + ",msg" + message);
        if (g_qtSipAccount.onInstantMessage) {
            g_qtSipAccount.onInstantMessage(fromUri, message);
        }
    }

    /**
 * Start a new SIP call to destination.
 * @return when the outbound call has been connected.
 * @reject {Error}  not registered
 * @reject {Error}  call in progress
 * @reject {Error}  disconnected
 */
    makeAudioDeviceCall(destination: string, param: string, audioDeviceId: number, songlist?: Array<string>): Promise<Call> {
        console.log('AccountExt.makeCall, des:' + destination + ", audioDeviceId:" + audioDeviceId);
        return new Promise((resolve, reject) => {
            if (this.state !== AccountState.REGISTED)
                return reject(new Error('not registered'));

            console.log("Make call to:" + destination + ",param:" + param + ",audioDevId:" + audioDeviceId);
            this.qtSipAccount.makeAudioDeviceCall(destination, param, audioDeviceId, (call: any) => {
                if (call) {
                    let callExt = new Call(this, call);
                    resolve(callExt);
                } else {
                    reject("Call fail");
                }
            })
        });
    }

    makeFileCall(destination: string, param: string, songPath: string): Promise<FileCall> {
        console.log('AccountExt.makeCall, des:' + destination + ", song:" + songPath);
        return new Promise((resolve, reject) => {
            if (this.state !== AccountState.REGISTED)
                return reject(new Error('not registered'));

            console.log("Make call to:" + destination + ",param:" + param + ",song:" + songPath);
            this.qtSipAccount.makeFilePlayCall(destination, param, songPath, (call: any) => {
                if (call) {
                    let callExt = new FileCall(this, call);
                    resolve(callExt);
                } else {
                    reject("Call fail");
                }
            })
        });
    }
}

export interface AudioDevInfo {
    name:string;
    inputCount:number;
    outputCount:number;
    driver:string;
}

export class PJSIP {
    public account: Account;
    private pjsip: any;

    init(port: number): Promise<string> {
        console.log("Call PJSIP.prototype.init, try qt init");
        return new Promise((resolve, reject) => {
            let self = this;
            self.pjsip = g_qtPjsip;
            self.account = g_qtSipAccount;

            if (self.pjsip) {
                self.pjsip.init(port, function (result: string) {
                    resolve(result);
                });
            } else {
                console.log("Error, cannot get the qt main window");
                reject("Can not init the QtWebEngineView");;
            }
        })

    }

    disconnect() {
        this.pjsip.disconnect();
    }

    enumDevs():Promise<Array<AudioDevInfo>> {
        return new Promise((resolve, reject) => {
            this.pjsip.enumDevs((devs:Array<any>) => {
                /*
                for (let dev of devs) {
                    console.log("id:" + dev.id + ",name:" + dev.name + ",inputCount:" + dev.inputCount + ",driver:"+ dev.driver);
                }
                */
                resolve(devs);
            })
        })
    }
}