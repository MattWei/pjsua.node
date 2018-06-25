import { QWebChannel } from "./qwebchannel";
import { rejects } from "assert";
import { resolve } from "dns";

var g_channel:any;

//var g_qtPjsip: any;
//var g_qtSipAccount: Account;
//var g_qtDatabase: any;
//var g_qtFileSystem: any;
//var g_qtPlayer: any;
//var g_qtRecorder: any;
//var g_qtApp: any;

var SUCCEED: string = "OK";

export class App {
    private qtApp:any;
    private static mInstance: App = null;
    onAppClose: () => void;

    private constructor() {

    }

    public setCloseEventSlot() {
        this.qtApp = g_channel.objects.app;
        let self = this;
        this.qtApp.appCloseEvent.connect(() => {
            if (self.onAppClose) {
                self.onAppClose();
            }
        });
    }

    public static getInstance() {
        if (!this.mInstance) {
            this.mInstance = new App();
        }

        return this.mInstance;
    }

    public getUUID(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.qtApp.getUUID((uuid: string) => {
                resolve(uuid);
            })
        })
    }

    public exit() {
        this.qtApp.exitApp();
    }
}


var qtWebChannel = new QWebChannel(qt.webChannelTransport, function (channel: any) {
    console.log("Run on QWebChannel create");
    g_channel = channel;


    App.getInstance().setCloseEventSlot();

    //g_qtDatabase = channel.objects.database;

    //g_qtPjsip = channel.objects.pjsip;
    //g_qtSipAccount = new Account(g_qtPjsip.account);

    //g_qtFileSystem = channel.objects.fileSystem;

    //g_qtPlayer = channel.objects.player;
    //g_qtRecorder = channel.objects.recorder;
});

export class QtSipPlayer {
    private qtPlayer:any = null;
    onPlayStateChanged: (songPath: string, type: number, param: number) => void = null;

    private static mInstance: QtSipPlayer = null;

    public static getInstance() {
        if (!this.mInstance) {
            this.mInstance = new QtSipPlayer();
        }

        return this.mInstance;
    }

    play(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.qtPlayer.play(path, (result: string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    reject(result);
                }
            })
        })
    }

    private constructor() {
        let self = this;
        this.qtPlayer = g_channel.objects.player;
        this.qtPlayer.playState.connect((songPath: string, type: number, param: number): void => {
            if (self.onPlayStateChanged) {
                self.onPlayStateChanged(songPath, type, param);
            }
        });
    }

    stop(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.qtPlayer.stop((result: string) => {
                if (result === SUCCEED) {
                    resolve(true)
                } else {
                    reject(result);
                }
            })
        })
    }
}

export class QtSipRecorder {
    private qtRecorder:any;

    private static mInstance: QtSipRecorder = null;

    public static getInstance() {
        if (!this.mInstance) {
            this.mInstance = new QtSipRecorder();
        }

        return this.mInstance;
    }

    private constructor() {
        this.qtRecorder = g_channel.objects.recorder;
    }

    record(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.qtRecorder.record(path, (result: string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    reject(result);
                }
            })
        })
    }



    stop(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.qtRecorder.stop((result: string) => {
                console.log("Stop record result: " + result);
                if (result === SUCCEED) {
                    resolve(true)
                } else {
                    reject(result);
                }
            })
        })
    }
}

export class QtFile {
    private qtFileSystem:any = null;
    private static mInstance: QtFile = null;

    public static getInstance() {
        if (!this.mInstance) {
            this.mInstance = new QtFile();
        }

        return this.mInstance;
    }

    private constructor() {
        this.qtFileSystem = g_channel.objects.fileSystem;
    }

    openFileDialog(): Promise<Array<string>> {
        return new Promise((resolve, reject) => {
            this.qtFileSystem.openFileDialog(function (files: Array<string>) {
                if (files) {
                    resolve(files);
                } else {
                    resolve(new Array<string>());
                }
            });
        })
    }

    listDir(path: string): Promise<Array<string>> {
        return new Promise((resolve, reject) => {
            this.qtFileSystem.listDir(path, (files: Array<string>) => {
                if (files) {
                    resolve(files);
                } else {
                    reject("list dir " + path + " fail");
                }
            })
        })
    }

    mkdir(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.qtFileSystem.mkdir(path, (result: string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
        })
    }

    rm(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.qtFileSystem.rm(path, (result: string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    reject(result);
                }
            })
        })
    }
}

export class QtDatabase {
    private qtSipDatabase: any;

    private static mInstance: QtDatabase = null;

    public static getInstance() {
        if (!this.mInstance) {
            this.mInstance = new QtDatabase();
        }

        return this.mInstance;
    }

    private constructor() {
        console.log("constructor database from pjsua");
        this.qtSipDatabase = g_channel.objects.database;;
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

    sendInstantMessage(message: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.qtSipBuddy.sendInstantMessage(message, (result: string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    reject(result);
                }
            })
        })
    }
}

export interface CallInfo {
    idString: string;
    state: number;
    lastStatusCode:number;
}

//var g_sipCallList:Map<string, Call> = new Map<string, Call>();

export class Call {
    protected qtSipCall: any;
    protected account: Account;
    protected callIdString: string;

    onStateChanged: (callInfo: CallInfo) => void = null;

    constructor(account: Account, call: any) {
        this.account = account;
        this.qtSipCall = call;

        this.qtSipCall.getCallId((id: string) => {
            console.log("Get Call Id:" + id);
            this.callIdString = id;
        });

        let self = this;
        this.qtSipCall.callStateChanged.connect((callInfo: CallInfo) => {
            if (self.onStateChanged) {
                console.log("send call state to sip service");
                self.onStateChanged(callInfo);
            }
        });
    }

    getCallId(): Promise<string> {
        return new Promise(resolve => {
            resolve(this.callIdString);
        })
    }

    hangup(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.qtSipCall.hangup((result: string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    reject(result);
                }
            });
        })
    }

    sendInstantMessage(message:string):Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.qtSipCall.sendInstantMessage(message, (result:string) => {
                if (result === SUCCEED) {
                    resolve(true);
                } else {
                    reject(result);
                }
            });
        })
        
    }
}

export class FileCall extends Call {
    onPlayStateChanged: (songPath: string, type: number, param: number) => void = null;

    constructor(account: Account, call: any) {
        super(account, call);
        let self = this;
        this.qtSipCall.playState.connect((songPath: string, type: number, param: number) => {
            if (self.onPlayStateChanged) {
                self.onPlayStateChanged(songPath, type, param);
            }
        });
    }

    play(songPath: string): Promise<boolean> {
        return new Promise((resolve, rejects) => {
            this.qtSipCall.play(songPath, (result: string) => {
                if (result == SUCCEED) {
                    resolve(true);
                }
                else {
                    rejects("Play " + songPath + " fail:" + result);
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

    private regStatechangedSlot:any;
    private instantMessageSlot:any;
    constructor(account: any) {
        this.state = AccountState.OFFLINE;
        this.qtSipAccount = account;

        let self = this;
        this.regStatechangedSlot = (regIsActive: boolean, stateCode: number) => {
            self.onAccountRegStateChanged(regIsActive, stateCode);
        };
        this.instantMessageSlot = (fromUri: string, message: string) => {
            console.log("Get instant message from " + fromUri + ",msg" + message);
            if (self.onInstantMessage) {
                self.onInstantMessage(fromUri, message);
            }
        };

        this.qtSipAccount.regStateChanged.connect(this.regStatechangedSlot);
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
            this.changeState(AccountState.REGISTED, stateCode);
        } else {
            this.changeState(AccountState.OFFLINE, stateCode);
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

    remove() {
        this.qtSipAccount.regStateChanged.disconnect(this.regStatechangedSlot);
        this.qtSipAccount.instantMessage.disconnect(this.instantMessageSlot);
    }
}

export interface AudioDevInfo {
    name: string;
    inputCount: number;
    outputCount: number;
    driver: string;
}

export class SipPlayer {
    private qtSipPlayer: any;
    constructor(player: any) {

    }
}

export class PJSIP {
    public account: Account;
    private pjsip: any;

    private static mInstance: PJSIP = null;

    public static getInstance() {
        if (!this.mInstance) {
            this.mInstance = new PJSIP();
        }

        return this.mInstance;
    }

    private constructor() {

    }

    init(port: number): Promise<string> {
        console.log("Call PJSIP.prototype.init, try qt init");
        return new Promise((resolve, reject) => {
            let self = this;
            self.pjsip = g_channel.objects.pjsip;;
            self.account = new Account(self.pjsip.account);;

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

    disconnect():Promise<void> {
        return new Promise((resolve) => {
            this.pjsip.disconnect((result:string) => {
                this.account.remove();
                resolve();
            });
        })
    }

    enumDevs(): Promise<Array<AudioDevInfo>> {
        return new Promise((resolve, reject) => {
            this.pjsip.enumDevs((devs: Array<any>) => {
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
