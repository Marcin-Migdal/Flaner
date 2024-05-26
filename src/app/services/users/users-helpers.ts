type RequestUid<TSenderID extends string, TReceiverID extends string> = `${TSenderID}_${TReceiverID}`;

export const getFriendRequestUid = <TSenderID extends string, TReceiverID extends string>(
    senderUid: TSenderID,
    receiverUid: TReceiverID
): RequestUid<TSenderID, TReceiverID> => {
    return `${senderUid}_${receiverUid}`;
};
