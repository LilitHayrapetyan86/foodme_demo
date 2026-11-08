package am.foodme.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FM-8: customers cancel their own order while it is still NEW. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderCancelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String customerToken() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullName", "Ann",
                "email", "cancel-it-" + UUID.randomUUID() + "@example.com",
                "phoneNumber", "+37491234567",
                "password", "secret123"));
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private String adminToken() throws Exception {
        String response = mockMvc.perform(post("/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "admin", "password", "admin123"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    /** Places a CASH takeaway order (chef and dish 1 from data.sql) and returns its number. */
    private String placeOrder(String token) throws Exception {
        String payload = objectMapper.writeValueAsString(Map.of(
                "chefId", 1,
                "receiverName", "Ann",
                "receiverPhoneNumber", "+37491234567",
                "receiverEmail", "ann@example.com",
                "paymentType", "CASH",
                "deliveryMethod", "TAKEAWAY",
                "note", "cancel test",
                "createOrderDishes", List.of(Map.of("dishId", 1, "quantity", 1))));
        String response = mockMvc.perform(post("/api/order")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("number").asText();
    }

    private long orderId(String number) throws Exception {
        String response = mockMvc.perform(get("/api/order/number/" + number))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    private void adminSetStatus(String number, String newStatus) throws Exception {
        mockMvc.perform(patch("/admin/order/" + orderId(number) + "/status")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", newStatus, "rejectReason", "test"))))
                .andExpect(status().isOk());
    }

    private String statusOf(String number) throws Exception {
        String response = mockMvc.perform(get("/api/order/number/" + number))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("status").asText();
    }

    @Test
    void cancelOrder_newOwnOrder_becomesCancelled() throws Exception {
        String token = customerToken();
        String number = placeOrder(token);

        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(number))
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertThat(statusOf(number)).isEqualTo("CANCELLED");
        mockMvc.perform(get("/api/customer/orders").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.list[0].number").value(number))
                .andExpect(jsonPath("$.list[0].status").value("CANCELLED"));
    }

    @Test
    void cancelOrder_acceptedOrder_conflict() throws Exception {
        String token = customerToken();
        String number = placeOrder(token);
        adminSetStatus(number, "ACCEPTED");

        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("can no longer be cancelled")));

        assertThat(statusOf(number)).isEqualTo("ACCEPTED");
    }

    @Test
    void cancelOrder_rejectedOrder_conflict() throws Exception {
        String token = customerToken();
        String number = placeOrder(token);
        adminSetStatus(number, "REJECTED");

        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());

        assertThat(statusOf(number)).isEqualTo("REJECTED");
    }

    @Test
    void cancelOrder_alreadyCancelled_conflict() throws Exception {
        String token = customerToken();
        String number = placeOrder(token);
        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    void cancelOrder_otherCustomersOrder_notFoundAndUnchanged() throws Exception {
        String number = placeOrder(customerToken());

        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + customerToken()))
                .andExpect(status().isNotFound());

        assertThat(statusOf(number)).isEqualTo("NEW");
    }

    @Test
    void cancelOrder_unknownNumber_notFound() throws Exception {
        mockMvc.perform(post("/api/customer/orders/FM-NOPE-" + UUID.randomUUID() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken()))
                .andExpect(status().isNotFound());
    }

    @Test
    void cancelOrder_withoutToken_unauthorized() throws Exception {
        String number = placeOrder(customerToken());

        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel"))
                .andExpect(status().isUnauthorized());

        assertThat(statusOf(number)).isEqualTo("NEW");
    }

    @Test
    void adminUpdateStatus_cancelledOrder_rejectedAndStaysCancelled() throws Exception {
        String token = customerToken();
        String number = placeOrder(token);
        mockMvc.perform(post("/api/customer/orders/" + number + "/cancel")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        String admin = adminToken();
        long id = orderId(number);

        for (String target : List.of("NEW", "ACCEPTED", "DELIVERED", "REJECTED")) {
            mockMvc.perform(patch("/admin/order/" + id + "/status")
                            .header("Authorization", "Bearer " + admin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("status", target, "rejectReason", "test"))))
                    .andExpect(status().isBadRequest());
        }

        assertThat(statusOf(number)).isEqualTo("CANCELLED");
    }
}
