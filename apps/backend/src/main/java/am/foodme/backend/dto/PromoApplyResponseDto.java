package am.foodme.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PromoApplyResponseDto {
    private String code;
    /** APPLIED, BELOW_MINIMUM, EXPIRED or NOT_FOUND. */
    private String status;
    private Integer percent;
    private Double missingAmount;
    private Double discount;
    private Double deliveryPrice;
    private Double total;
}
