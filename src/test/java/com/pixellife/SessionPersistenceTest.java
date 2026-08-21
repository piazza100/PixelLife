package com.pixellife;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DB_TEST", matches = "true")
@SuppressWarnings({"rawtypes", "unchecked"})
class SessionPersistenceTest {
    @Autowired SessionRepository sessions;

    @Test
    void sessionCanBeSavedReadAndDeleted() {
        Session session = (Session) sessions.createSession();
        session.setAttribute("pixellife.test", "ok");
        sessions.save(session);
        try {
            Session stored = (Session) sessions.findById(session.getId());
            assertThat(stored).isNotNull();
            assertThat((String) stored.getAttribute("pixellife.test")).isEqualTo("ok");
        } finally {
            sessions.deleteById(session.getId());
        }
        assertThat(sessions.findById(session.getId())).isNull();
    }
}
