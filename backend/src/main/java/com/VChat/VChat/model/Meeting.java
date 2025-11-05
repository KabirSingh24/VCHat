package com.VChat.VChat.model;


import com.VChat.VChat.config.AudiField;
import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "meetings")
public class Meeting extends AudiField {

    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    private String meetingCode;

    private Date date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

}
