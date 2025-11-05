package com.VChat.VChat.model;


import com.VChat.VChat.config.AudiField;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@Table(name = "users")
public class User extends AudiField {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name Should Not be Blank")
    private String name;

    @NotBlank(message = "Username Should Not be Blank")
    private String username;

    @NotBlank(message = "Password Should Not be Blank")
    private String password;

    private String token;
}
