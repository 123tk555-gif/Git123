package com.example.taskboard.demo;

import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 体験版(taskboard.demo.enabled=true)のときだけ動く。起動時と、決めた時刻(既定は毎日 午前4時)に、
 * テストデータへ戻す。誰でも書き換えられる公開の体験版で、いたずらを翌日まで残さないため。
 */
@Component
@ConditionalOnProperty(name = "taskboard.demo.enabled", havingValue = "true")
public class DemoResetter {

    private static final Logger log = LoggerFactory.getLogger(DemoResetter.class);
    private static final String SEED = "db/seed/test-data.sql";

    private final DataSource dataSource;

    public DemoResetter(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "${taskboard.demo.reset-cron:0 0 4 * * *}", zone = "Asia/Tokyo")
    public void reset() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource(SEED));
        populator.setSqlScriptEncoding("UTF-8");
        populator.execute(dataSource);
        log.info("体験版: テストデータに戻しました");
    }
}
