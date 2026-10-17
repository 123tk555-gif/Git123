package com.example.taskboard.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.taskboard.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 体験版: 起動時と決めた時刻にテストデータへ戻ること、カードの上限、画面向けの情報。
 * 実際の体験版の設定ファイル(application-demo.properties)を読み込んで確かめる(文字化けなどに気づけるように)。
 * 上限だけはテストしやすいよう 15 枚(テストデータは 13 + ゴミ箱 1 = 14 枚)にし、時刻での自動実行は止めておく。
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
        "spring.profiles.active=demo",
        "taskboard.demo.reset-cron=-",
        "taskboard.max-tasks=15",
})
@AutoConfigureMockMvc
class DemoModeTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private DemoResetter resetter;

    @Autowired
    private JdbcTemplate jdbc;

    private int count(String where) {
        return jdbc.queryForObject("select count(*) from tasks where " + where, Integer.class);
    }

    @Test
    void 画面向けに体験版であることと上限を返す() throws Exception {
        mvc.perform(get("/api/app-info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.demo").value(true))
                .andExpect(jsonPath("$.resetLabel").value("毎日 午前4時(日本時間)"))
                .andExpect(jsonPath("$.maxTasks").value(15));
    }

    @Test
    void 戻す処理でテストデータの状態になり_追加や削除が消える() throws Exception {
        resetter.reset();
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"いたずら\"}"))
                .andExpect(status().isCreated());
        List<Integer> ids = JsonPath.read(
                mvc.perform(get("/api/tasks")).andReturn().getResponse().getContentAsString(), "$[*].id");
        mvc.perform(delete("/api/tasks/" + ids.get(0))).andExpect(status().isNoContent());

        resetter.reset();

        assertThat(count("deleted_at is null")).isEqualTo(13);
        assertThat(count("deleted_at is not null")).isEqualTo(1);
        assertThat(count("title = 'いたずら'")).isZero();
        assertThat(jdbc.queryForObject("select count(*) from task_history", Integer.class)).isEqualTo(1);
    }

    @Test
    void カードは上限まで_ゴミ箱を含めて数える() throws Exception {
        resetter.reset(); // 14 枚(ボード 13 + ゴミ箱 1)
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"15枚目\"}"))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"16枚目\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("最大15枚")));

        // ゴミ箱を空にすると、また追加できる
        mvc.perform(delete("/api/trash")).andExpect(status().isOk());
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"空にしたあと\"}"))
                .andExpect(status().isCreated());
        resetter.reset();
    }
}
