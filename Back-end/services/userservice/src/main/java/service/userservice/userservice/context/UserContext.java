package service.userservice.userservice.context;

import java.util.Map;

public class UserContext {
    private static final ThreadLocal<Map<String, Object>> userClaims = new ThreadLocal<>();

    public static void setClaims(Map<String, Object> claims) { userClaims.set(claims); }
    public static void clear() { userClaims.remove(); }
    
    // Extracting core user details dynamically from the token
    public static String getUserId() { return extract("userId"); }
    public static String getRole() { return extract("role"); }
    public static String getName() { return extract("name"); }
    public static String getPhone() { return extract("phone"); }

    private static String extract(String key) {
        return userClaims.get() != null && userClaims.get().get(key) != null ? String.valueOf(userClaims.get().get(key)) : null;
    }
}