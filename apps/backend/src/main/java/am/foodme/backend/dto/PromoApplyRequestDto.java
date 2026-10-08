package am.foodme.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PromoApplyRequestDto {
    private String code;
    private Long chefId;
    private Double subtotal;
    private String deliveryMethod;
}
