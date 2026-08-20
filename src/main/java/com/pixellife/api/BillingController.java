package com.pixellife.api;

import com.pixellife.service.BillingService;
import com.pixellife.service.PixelLifeService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/billing")
public class BillingController {
    private final BillingService billing;
    private final PixelLifeService pixelLife;

    public BillingController(BillingService billing, PixelLifeService pixelLife) {
        this.billing = billing;
        this.pixelLife = pixelLife;
    }

    @PostMapping("/checkout")
    public Map<String,String> checkout(@AuthenticationPrincipal OidcUser user, HttpServletRequest request) {
        long userId = pixelLife.ensureMember(user.getSubject(), user.getEmail(), user.getFullName(), user.getPicture(), "en");
        return Map.of("url", billing.createPlusCheckout(userId, user.getEmail(), request.getRemoteAddr()));
    }

    @PostMapping("/portal")
    public Map<String,String> portal(@AuthenticationPrincipal OidcUser user) {
        long userId = pixelLife.ensureMember(user.getSubject(), user.getEmail(), user.getFullName(), user.getPicture(), "en");
        return Map.of("url", billing.createCustomerPortal(userId));
    }

    @PostMapping("/polar/webhook")
    public ResponseEntity<Void> polarWebhook(@RequestBody byte[] payload,
                                             @RequestHeader("webhook-id") String webhookId,
                                             @RequestHeader("webhook-timestamp") String timestamp,
                                             @RequestHeader("webhook-signature") String signature) {
        try {
            billing.handleWebhook(payload, webhookId, timestamp, signature);
            return ResponseEntity.accepted().build();
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }
}
