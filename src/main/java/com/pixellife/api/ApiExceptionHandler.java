package com.pixellife.api;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(NoSuchElementException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
    Map<String,String> notFound(NoSuchElementException ex) { return error("NOT_FOUND", ex.getMessage()); }
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class}) @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String,String> badRequest(Exception ex) { return error("BAD_REQUEST", "Please check your input."); }
    @ExceptionHandler(IllegalStateException.class) @ResponseStatus(HttpStatus.CONFLICT)
    Map<String,String> conflict(IllegalStateException ex) { return error("INVALID_STATE", ex.getMessage()); }
    private Map<String,String> error(String code,String message) { return Map.of("code",code,"message",message); }
}
