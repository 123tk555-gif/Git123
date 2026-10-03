package com.example.taskboard;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/** エラーのときも、画面側が読みやすい {"message": "..."} の形で返す。 */
@RestControllerAdvice
class ApiExceptionHandler {

    record FieldProblem(String field, String message) {
    }

    record ApiError(String message, List<FieldProblem> errors) {
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalidBody(MethodArgumentNotValidException e) {
        List<FieldProblem> problems = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new FieldProblem(f.getField(), f.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest().body(new ApiError("入力内容に誤りがあります", problems));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadableBody(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest()
                .body(new ApiError("リクエストの形式が正しくありません(JSON・日付・選択肢の値を確認してください)", List.of()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> invalidParameter(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest()
                .body(new ApiError("パラメータ「" + e.getName() + "」の値が正しくありません", List.of()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> status(ResponseStatusException e) {
        HttpStatus status = HttpStatus.valueOf(e.getStatusCode().value());
        String message = e.getReason() != null ? e.getReason() : status.getReasonPhrase();
        return ResponseEntity.status(status).body(new ApiError(message, List.of()));
    }
}
