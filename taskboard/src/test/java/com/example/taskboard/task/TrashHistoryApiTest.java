package com.example.taskboard.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.taskboard.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** ゴミ箱・操作履歴・最終更新日時。テスト専用のデータベースで動かし、各テストの変更は終わると元に戻る。 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TrashHistoryApiTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TaskService service;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    private int create(String json) throws Exception {
        String body = mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private String getJson(String url) throws Exception {
        return mvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private List<Integer> trashIds() throws Exception {
        return JsonPath.read(getJson("/api/trash"), "$.items[*].task.id");
    }

    private List<Integer> boardIds(String status) throws Exception {
        return JsonPath.read(getJson("/api/tasks?status=" + status), "$[*].id");
    }

    private Instant updatedAtOf(int id) throws Exception {
        return Instant.parse(JsonPath.read(getJson("/api/tasks/" + id), "$.updatedAt"));
    }

    // ---- ゴミ箱 ----

    @Test
    void 削除するとゴミ箱に入り_ボードと検索と1件取得から消える() throws Exception {
        int id = create("{\"title\":\"消すカード\"}");

        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());

        mvc.perform(get("/api/tasks/" + id)).andExpect(status().isNotFound());
        assertThat(boardIds("TODO")).doesNotContain(id);
        assertThat(trashIds()).contains(id);
        String trash = getJson("/api/trash");
        assertThat((Integer) JsonPath.read(trash, "$.retentionDays")).isEqualTo(30);
        Instant deletedAt = Instant.parse(JsonPath.read(trash, "$.items[0].deletedAt"));
        Instant purgeAt = Instant.parse(JsonPath.read(trash, "$.items[0].purgeAt"));
        assertThat(Duration.between(deletedAt, purgeAt)).isEqualTo(Duration.ofDays(30));
    }

    @Test
    void ゴミ箱のカードは編集も移動もできない() throws Exception {
        int id = create("{\"title\":\"消すカード\"}");
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());

        mvc.perform(put("/api/tasks/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\",\"status\":\"TODO\",\"priority\":\"LOW\",\"color\":\"WHITE\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/tasks/" + id + "/position").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"DONE\",\"index\":0}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void 元に戻すと_元の列の末尾に戻り_ゴミ箱から消える() throws Exception {
        int a = create("{\"title\":\"A\",\"status\":\"DONE\"}");
        int b = create("{\"title\":\"B\",\"status\":\"DONE\"}");
        mvc.perform(delete("/api/tasks/" + a)).andExpect(status().isNoContent());

        mvc.perform(post("/api/trash/" + a + "/restore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(a))
                .andExpect(jsonPath("$.status").value("DONE"));

        List<Integer> done = boardIds("DONE");
        assertThat(done.get(done.size() - 1)).isEqualTo(a);
        assertThat(done).contains(b);
        assertThat(trashIds()).doesNotContain(a);
        mvc.perform(post("/api/trash/" + a + "/restore")).andExpect(status().isNotFound());
    }

    @Test
    void 完全に削除すると_どこからも消え_ボードのカードは完全に削除できない() throws Exception {
        int id = create("{\"title\":\"完全に消す\"}");
        int onBoard = create("{\"title\":\"ボードのまま\"}");
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());

        mvc.perform(delete("/api/trash/" + id)).andExpect(status().isNoContent());

        assertThat(trashIds()).doesNotContain(id);
        mvc.perform(delete("/api/trash/" + id)).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(delete("/api/trash/" + onBoard)).andExpect(status().isNotFound());
        mvc.perform(get("/api/tasks/" + onBoard)).andExpect(status().isOk());
    }

    @Test
    void ゴミ箱を空にすると全部消え_消した件数が返る() throws Exception {
        int x = create("{\"title\":\"X\"}");
        int y = create("{\"title\":\"Y\"}");
        mvc.perform(delete("/api/tasks/" + x));
        mvc.perform(delete("/api/tasks/" + y));
        int before = trashIds().size();

        mvc.perform(delete("/api/trash"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(before));
        assertThat(trashIds()).isEmpty();
    }

    @Test
    void 保存期間を過ぎたカードだけが自動で完全に削除される() throws Exception {
        int old = create("{\"title\":\"古い\"}");
        int recent = create("{\"title\":\"新しい\"}");
        mvc.perform(delete("/api/tasks/" + old));
        mvc.perform(delete("/api/tasks/" + recent));
        entityManager.flush();
        jdbc.update("update tasks set deleted_at = now() - interval '31 days' where id = ?", old);
        entityManager.clear();

        int purged = service.purgeExpired();

        assertThat(purged).isGreaterThanOrEqualTo(1);
        assertThat(trashIds()).doesNotContain(old).contains(recent);
        String history = getJson("/api/history?taskId=" + old);
        assertThat((String) JsonPath.read(history, "$[0].action")).isEqualTo("PURGED");
        assertThat((String) JsonPath.read(history, "$[0].detail")).contains("自動で完全に削除");
    }

    // ---- 操作履歴 ----

    @Test
    void 操作履歴が新しい順に記録され_変わった項目が説明に入る() throws Exception {
        int id = create("{\"title\":\"A\"}");
        mvc.perform(put("/api/tasks/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"B\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"color\":\"WHITE\",\"dueDate\":\"2026-12-24\"}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/tasks/" + id + "/position").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"DONE\",\"index\":0}")).andExpect(status().isOk());
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());
        mvc.perform(post("/api/trash/" + id + "/restore")).andExpect(status().isOk());
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/trash/" + id)).andExpect(status().isNoContent());

        String history = getJson("/api/history?taskId=" + id);
        List<String> actions = JsonPath.read(history, "$[*].action");
        assertThat(actions).containsExactly("PURGED", "DELETED", "RESTORED", "DELETED", "MOVED", "UPDATED", "CREATED");
        List<String> details = JsonPath.read(history, "$[*].detail");
        assertThat(details.get(6)).contains("「未着手」に追加").contains("優先度: 中");
        assertThat(details.get(5)).contains("内容: 「A」 → 「B」").contains("優先度: 中 → 高").contains("期限: なし → 2026年12月24日");
        assertThat(details.get(4)).contains("「未着手」から「完了」へ移動");
        assertThat(details.get(2)).contains("ゴミ箱から「完了」の末尾に戻した");
        List<String> titles = JsonPath.read(history, "$[*].taskTitle");
        assertThat(titles.get(0)).isEqualTo("B");
    }

    @Test
    void 操作履歴は件数を指定でき_範囲外なら400() throws Exception {
        create("{\"title\":\"1\"}");
        create("{\"title\":\"2\"}");
        List<Object> one = JsonPath.read(getJson("/api/history?limit=1"), "$");
        assertThat(one).hasSize(1);
        mvc.perform(get("/api/history?limit=0")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(get("/api/history?limit=501")).andExpect(status().isBadRequest());
    }

    // ---- 最終更新日時 ----

    @Test
    void 最終更新日時は編集で変わり_並び位置の振り直しだけでは変わらない() throws Exception {
        int a = create("{\"title\":\"A\",\"status\":\"DONE\"}");
        int b = create("{\"title\":\"B\",\"status\":\"DONE\"}");
        String created = getJson("/api/tasks/" + a);
        assertThat((String) JsonPath.read(created, "$.updatedAt")).isEqualTo(JsonPath.read(created, "$.createdAt"));
        Instant before = updatedAtOf(a);

        mvc.perform(put("/api/tasks/" + b + "/position").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"DONE\",\"index\":0}")).andExpect(status().isOk());
        assertThat(updatedAtOf(a)).isEqualTo(before);

        Thread.sleep(20);
        mvc.perform(put("/api/tasks/" + a).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"A2\",\"status\":\"DONE\",\"priority\":\"LOW\",\"color\":\"WHITE\"}"))
                .andExpect(status().isOk());
        assertThat(updatedAtOf(a)).isAfter(before);
    }
}
