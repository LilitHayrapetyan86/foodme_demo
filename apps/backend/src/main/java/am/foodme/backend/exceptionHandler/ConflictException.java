package am.foodme.backend.exceptionHandler;

/** The request is valid but conflicts with the current state of the resource (HTTP 409). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
