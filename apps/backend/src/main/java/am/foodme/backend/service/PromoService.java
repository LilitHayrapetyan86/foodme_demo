package am.foodme.backend.service;

import am.foodme.backend.dto.PromoApplyResponseDto;
import am.foodme.backend.model.PromoCode;
import am.foodme.backend.repository.PromoCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class PromoService {

    public static final String APPLIED = "APPLIED";
    public static final String BELOW_MINIMUM = "BELOW_MINIMUM";
    public static final String EXPIRED = "EXPIRED";
    public static final String NOT_FOUND = "NOT_FOUND";

    private final PromoCodeRepository promoCodeRepository;

    public PromoService(PromoCodeRepository promoCodeRepository) {
        this.promoCodeRepository = promoCodeRepository;
    }

    /** Prices a promo code against an order subtotal and the delivery fee for that subtotal. */
    @Transactional(readOnly = true)
    public PromoApplyResponseDto quote(String code, double subtotal, double deliveryPrice) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        double fullTotal = subtotal + deliveryPrice;

        Optional<PromoCode> found = normalized.isEmpty()
                ? Optional.empty()
                : promoCodeRepository.findByCodeIgnoreCase(normalized);
        if (found.isEmpty()) {
            return new PromoApplyResponseDto(normalized, NOT_FOUND, null, null, 0.0, deliveryPrice, fullTotal);
        }

        PromoCode promo = found.get();
        if (promo.getValidUntil() != null && promo.getValidUntil().isBefore(LocalDate.now())) {
            return new PromoApplyResponseDto(promo.getCode(), EXPIRED, promo.getPercent(), null, 0.0, deliveryPrice, fullTotal);
        }
        if (subtotal < promo.getMinOrderAmount()) {
            return new PromoApplyResponseDto(promo.getCode(), BELOW_MINIMUM, promo.getPercent(),
                    promo.getMinOrderAmount() - subtotal, 0.0, deliveryPrice, fullTotal);
        }

        // KAN-27: the percentage applies to the subtotal only, not to the delivery fee.
        double discount = Math.round(subtotal * promo.getPercent() / 100.0);
        return new PromoApplyResponseDto(promo.getCode(), APPLIED, promo.getPercent(), null,
                discount, deliveryPrice, fullTotal - discount);
    }
}
