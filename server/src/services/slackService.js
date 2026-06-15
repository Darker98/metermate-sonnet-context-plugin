"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.slackService = void 0;
var slack_apimatic_sdk_1 = require("slack-apimatic-sdk");
var slackClient_1 = require("../slackClient");
var transactionStore_1 = require("../stores/transactionStore");
function sanitizeChannelSegment(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20);
}
function buildChannelName(consultantId, clientEmail, seq) {
    var consultantSlug = sanitizeChannelSegment(consultantId);
    var clientSlug = sanitizeChannelSegment(clientEmail.split('@')[0]);
    var name = "txn-".concat(consultantSlug, "-").concat(clientSlug, "-").concat(seq.toString().padStart(3, '0'));
    return name.slice(0, 80);
}
function lookupUserByEmail(email) {
    return __awaiter(this, void 0, void 0, function () {
        var token, usersApi, response, user, err_1, body;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    token = (0, slackClient_1.getBotToken)();
                    usersApi = new slack_apimatic_sdk_1.UsersApi((0, slackClient_1.getSlackClient)());
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, usersApi.usersLookupByEmail(token, email)];
                case 2:
                    response = _b.sent();
                    if (response.result && response.result.ok) {
                        user = response.result.user;
                        return [2 /*return*/, (_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : null];
                    }
                    return [2 /*return*/, null];
                case 3:
                    err_1 = _b.sent();
                    if (err_1 instanceof slack_apimatic_sdk_1.ApiError) {
                        body = err_1.body;
                        if (body.includes('users_not_found')) {
                            return [2 /*return*/, null];
                        }
                    }
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function createPrivateChannel(name) {
    return __awaiter(this, void 0, void 0, function () {
        var token, conversationsApi, response, channel, err_2, body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = (0, slackClient_1.getBotToken)();
                    conversationsApi = new slack_apimatic_sdk_1.ConversationsApi((0, slackClient_1.getSlackClient)());
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, conversationsApi.conversationsCreate(token, name, true)];
                case 2:
                    response = _a.sent();
                    if (response.result && response.result.ok) {
                        channel = response.result.channel;
                        if (channel) {
                            return [2 /*return*/, { id: channel.id, name: channel.name }];
                        }
                    }
                    return [2 /*return*/, null];
                case 3:
                    err_2 = _a.sent();
                    if (err_2 instanceof slack_apimatic_sdk_1.ApiError) {
                        body = err_2.body;
                        if (body.includes('name_taken')) {
                            return [2 /*return*/, null];
                        }
                        console.error('[slackService] createPrivateChannel error:', err_2.statusCode, err_2.body);
                    }
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function inviteUserToChannel(channelId, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var token, conversationsApi, err_3, body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = (0, slackClient_1.getBotToken)();
                    conversationsApi = new slack_apimatic_sdk_1.ConversationsApi((0, slackClient_1.getSlackClient)());
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, conversationsApi.conversationsInvite(token, channelId, userId)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    err_3 = _a.sent();
                    if (err_3 instanceof slack_apimatic_sdk_1.ApiError) {
                        body = err_3.body;
                        if (body.includes('already_in_channel'))
                            return [2 /*return*/, true];
                        console.warn('[slackService] inviteUserToChannel failed:', err_3.statusCode, err_3.body);
                    }
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function postMessage(channelId, text, blocks) {
    return __awaiter(this, void 0, void 0, function () {
        var token, chatApi, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = (0, slackClient_1.getBotToken)();
                    chatApi = new slack_apimatic_sdk_1.ChatApi((0, slackClient_1.getSlackClient)());
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, chatApi.chatPostMessage(token, channelId, undefined, // asUser
                        undefined, // attachments
                        blocks ? JSON.stringify(blocks) : undefined, // blocks
                        undefined, // iconEmoji
                        undefined, // iconUrl
                        undefined, // linkNames
                        undefined, // mrkdwn
                        undefined, // parse
                        undefined, // replyBroadcast
                        text // text
                        )];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _a.sent();
                    console.error('[slackService] postMessage error:', err_4 instanceof slack_apimatic_sdk_1.ApiError ? err_4.body : err_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var _channelSeq = 1;
exports.slackService = {
    ensureTxnChannel: function (txn, consultantEmail) {
        return __awaiter(this, void 0, void 0, function () {
            var existingChannelId, channelName, created, channelId, resolvedChannelName, _a, consultantUserId, clientUserId, consultantInvited, clientInvited;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        existingChannelId = transactionStore_1.transactionStore.getChannelId(txn.consultantId, txn.clientEmail);
                        if (existingChannelId && txn.channelId) {
                            return [2 /*return*/, {
                                    channelId: txn.channelId,
                                    channelName: (_b = txn.channelName) !== null && _b !== void 0 ? _b : '',
                                    clientInvited: false,
                                    consultantInvited: false,
                                }];
                        }
                        channelName = buildChannelName(txn.consultantId, txn.clientEmail, _channelSeq++);
                        return [4 /*yield*/, createPrivateChannel(channelName)];
                    case 1:
                        created = _d.sent();
                        if (!created) {
                            channelId = existingChannelId !== null && existingChannelId !== void 0 ? existingChannelId : '';
                            resolvedChannelName = (_c = txn.channelName) !== null && _c !== void 0 ? _c : channelName;
                            if (!channelId) {
                                console.error('[slackService] Could not create or find channel');
                                return [2 /*return*/, { channelId: '', channelName: channelName, clientInvited: false, consultantInvited: false }];
                            }
                        }
                        else {
                            channelId = created.id;
                            resolvedChannelName = created.name;
                        }
                        transactionStore_1.transactionStore.setChannel(txn.txnId, channelId, resolvedChannelName);
                        return [4 /*yield*/, Promise.all([
                                lookupUserByEmail(consultantEmail),
                                lookupUserByEmail(txn.clientEmail),
                            ])];
                    case 2:
                        _a = _d.sent(), consultantUserId = _a[0], clientUserId = _a[1];
                        consultantInvited = false;
                        clientInvited = false;
                        if (!consultantUserId) return [3 /*break*/, 4];
                        return [4 /*yield*/, inviteUserToChannel(channelId, consultantUserId)];
                    case 3:
                        consultantInvited = _d.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        console.warn("[slackService] Consultant ".concat(consultantEmail, " not found in workspace"));
                        _d.label = 5;
                    case 5:
                        if (!clientUserId) return [3 /*break*/, 7];
                        return [4 /*yield*/, inviteUserToChannel(channelId, clientUserId)];
                    case 6:
                        clientInvited = _d.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        console.warn("[slackService] Client ".concat(txn.clientEmail, " not found in workspace \u2014 will notify by email via Maxio"));
                        _d.label = 8;
                    case 8: return [4 /*yield*/, postMessage(channelId, ':wave: Transaction started', buildStartedBlocks(txn))];
                    case 9:
                        _d.sent();
                        if (!!clientInvited) return [3 /*break*/, 11];
                        return [4 /*yield*/, postMessage(channelId, ':information_source: Client could not be added to this channel (not a workspace member). They will be notified by email.')];
                    case 10:
                        _d.sent();
                        _d.label = 11;
                    case 11: return [2 /*return*/, { channelId: channelId, channelName: resolvedChannelName, clientInvited: clientInvited, consultantInvited: consultantInvited }];
                }
            });
        });
    },
    postProgress: function (channelId, text, blocks) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postMessage(channelId, text, blocks)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    postCompletion: function (channelId, text, blocks) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postMessage(channelId, text, blocks)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    postFailure: function (channelId, errorSummary, ucName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, postMessage(channelId, ":warning: ".concat(ucName, " failed"), buildFailureBlocks(ucName, errorSummary))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    checkHealth: function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, usersApi, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        token = (0, slackClient_1.getBotToken)();
                        usersApi = new slack_apimatic_sdk_1.UsersApi((0, slackClient_1.getSlackClient)());
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, usersApi.usersList(token, 1)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
};
function buildStartedBlocks(txn) {
    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: ':wave: Transaction started', emoji: true },
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: "*Consultant:*\n".concat(txn.consultantId) },
                { type: 'mrkdwn', text: "*Client:*\n".concat(txn.clientEmail) },
                { type: 'mrkdwn', text: "*Type:*\n".concat(txn.type) },
                { type: 'mrkdwn', text: "*Transaction ID:*\n".concat(txn.txnId) },
            ],
        },
        {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: "Started at <!date^".concat(Math.floor(txn.createdAt / 1000), "^{date_short_pretty} {time}|").concat(new Date(txn.createdAt).toISOString(), ">") }],
        },
    ];
}
function buildFailureBlocks(ucName, errorSummary) {
    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: ":warning: ".concat(ucName, " failed"), emoji: true },
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: "*Error:*\n".concat(errorSummary) },
        },
    ];
}
