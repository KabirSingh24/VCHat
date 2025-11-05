package com.VChat.VChat.repo;

import com.VChat.VChat.model.Meeting;
import com.VChat.VChat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeetingRepo extends JpaRepository<Meeting,Long> {
    List<Meeting> findByUserId(Long id);
}
