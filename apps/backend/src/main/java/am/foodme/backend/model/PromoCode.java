package am.foodme.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "promo_code", schema = "foodme")
@Getter
@Setter
public class PromoCode {

    @Id
    @SequenceGenerator(name = "promo_code_id_seq", sequenceName = "foodme.promo_code_id_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "promo_code_id_seq")
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    /** 1..100 */
    @Column(name = "percent", nullable = false)
    private Integer percent;

    @Column(name = "min_order_amount", nullable = false)
    private Double minOrderAmount;

    /** Last day the code can be used; null means it never expires. */
    @Column(name = "valid_until")
    private LocalDate validUntil;
}
