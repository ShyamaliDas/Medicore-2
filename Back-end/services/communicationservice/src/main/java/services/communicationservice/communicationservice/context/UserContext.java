package services.communicationservice.communicationservice.context;

import java.util.Map;

public class UserContext {
    private static final ThreadLocal<Map<String, Object>> userClaims = new ThreadLocal<>();

    public static void setClaims(Map<String, Object> claims) {
        userClaims.set(claims);
    }

    public static Map<String, Object> getClaims() {
        return userClaims.get();
    }

    public static String getUserId() {
        return userClaims.get() != null ? (String) userClaims.get().get("userId") : null;
    }

    public static String getRole() {
        return userClaims.get() != null ? (String) userClaims.get().get("role") : null;
    }

    public static void clear() {
        userClaims.remove();
    }
}