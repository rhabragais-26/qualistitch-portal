import { doc, setDoc, Firestore } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

type LogActivityParams = {
    firestore: Firestore;
    user: { uid: string; nickname: string };
    action: string;
    details: string;
    entityId?: string;
    entityType?: string;
};

export const logActivity = (params: LogActivityParams): void => {
    const { firestore, user, action, details, entityId, entityType } = params;

    if (!firestore || !user || !user.uid || !user.nickname) {
        console.error("Firestore or user details not available for logging activity.", { user, firestore });
        return;
    }

    const logId = uuidv4();
    const logRef = doc(firestore, 'activityLogs', logId);

    const logData = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        userNickname: user.nickname,
        action: action,
        details: details,
        entityId: entityId || null,
        entityType: entityType || null,
    };

    // Use setDoc in a "fire-and-forget" manner for logging.
    // We don't want logging failures to block the main user action.
    setDoc(logRef, logData).catch(error => {
        console.error("Failed to write activity log:", error);
    });
};
