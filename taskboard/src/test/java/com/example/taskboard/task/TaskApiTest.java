package com.example.taskboard.task;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** データベースにつないで API を呼ぶ。各テストの変更は終わると元に戻る(ロールバック)。 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TaskApiTest {

    @Autowired
    private MockMvc mvc;

    private int createAndGetId(String json) throws Exception {
        String body = mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private int sortOrderOf(int id) throws Exception {
        String body = mvc.perform(get("/api/tasks/" + id)).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.sortOrder");
    }

    @Test
    void 追加_省略した項目は既定値になり_その列の末尾に入る() throws Exception {
        int first = createAndGetId("{\"title\":\"  買い物に行く  \"}");
        int second = createAndGetId("{\"title\":\"次のタスク\"}");

        mvc.perform(get("/api/tasks/" + first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("買い物に行く"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.color").value("WHITE"))
                .andExpect(jsonPath("$.dueDate").doesNotExist())
                .andExpect(jsonPath("$.category").doesNotExist());
        org.assertj.core.api.Assertions.assertThat(sortOrderOf(second)).isEqualTo(sortOrderOf(first) + 1);
    }

    @Test
    void 追加_全項目を指定できて_Locationが返る() throws Exception {
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("""
                {"title":"レポート提出","status":"IN_PROGRESS","dueDate":"2026-12-31",
                 "priority":"HIGH","category":" 仕事 ","color":"PINK"}"""))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/tasks/")))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.dueDate").value("2026-12-31"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.category").value("仕事"))
                .andExpect(jsonPath("$.color").value("PINK"));
    }

    @Test
    void 追加_入力が不正なら400() throws Exception {
        String[] badBodies = {
                "{\"title\":\"\"}",
                "{\"title\":\"   \"}",
                "{}",
                "{\"title\":\"" + "あ".repeat(201) + "\"}",
                "{\"title\":\"x\",\"category\":\"" + "あ".repeat(51) + "\"}",
                "{\"title\":\"x\",\"status\":\"XXX\"}",
                "{\"title\":\"x\",\"dueDate\":\"2026-13-40\"}",
                "{\"title\":",
        };
        for (String body : badBodies) {
            mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
    }

    @Test
    void 追加_内容が空のときは項目名つきのエラーが返る() throws Exception {
        mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("title"))
                .andExpect(jsonPath("$.errors[0].message").value("内容を入力してください"));
    }

    @Test
    void 更新_全項目を置き換え_状態が変わると移動先の列の末尾に移る() throws Exception {
        int id = createAndGetId("{\"title\":\"元の内容\",\"category\":\"個人\"}");
        int doneA = createAndGetId("{\"title\":\"完了A\",\"status\":\"DONE\"}");

        mvc.perform(put("/api/tasks/" + id).contentType(MediaType.APPLICATION_JSON).content("""
                {"title":"新しい内容","status":"DONE","dueDate":"2027-01-15",
                 "priority":"LOW","category":"","color":"GREEN"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("新しい内容"))
                .andExpect(jsonPath("$.status").value("DONE"))
                .andExpect(jsonPath("$.dueDate").value("2027-01-15"))
                .andExpect(jsonPath("$.priority").value("LOW"))
                .andExpect(jsonPath("$.category").doesNotExist())
                .andExpect(jsonPath("$.color").value("GREEN"))
                .andExpect(jsonPath("$.sortOrder").value(sortOrderOf(doneA) + 1));
    }

    @Test
    void 更新_状態が同じなら並び位置は変わらない() throws Exception {
        int id = createAndGetId("{\"title\":\"A\"}");
        createAndGetId("{\"title\":\"B\"}");
        int before = sortOrderOf(id);

        mvc.perform(put("/api/tasks/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"A2\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"color\":\"BLUE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sortOrder").value(before));
    }

    @Test
    void 更新_status_priority_colorが無いと400_存在しないidは404() throws Exception {
        int id = createAndGetId("{\"title\":\"A\"}");

        mvc.perform(put("/api/tasks/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"A2\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(put("/api/tasks/999999").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\",\"status\":\"TODO\",\"priority\":\"LOW\",\"color\":\"WHITE\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    private java.util.List<Integer> idsIn(String status) throws Exception {
        String body = mvc.perform(get("/api/tasks?status=" + status)).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$[*].id");
    }

    private java.util.List<Integer> sortOrdersIn(String status) throws Exception {
        String body = mvc.perform(get("/api/tasks?status=" + status)).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$[*].sortOrder");
    }

    private void move(int id, String status, int index) throws Exception {
        mvc.perform(put("/api/tasks/" + id + "/position").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"" + status + "\",\"index\":" + index + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value(status));
    }

    private static void assertNumberedFromOne(java.util.List<Integer> sortOrders) {
        for (int i = 0; i < sortOrders.size(); i++) {
            org.assertj.core.api.Assertions.assertThat(sortOrders.get(i)).isEqualTo(i + 1);
        }
    }

    @Test
    void 移動_同じ列の中で指定した位置に入り_並び位置が1から振り直される() throws Exception {
        int a = createAndGetId("{\"title\":\"A\",\"status\":\"DONE\"}");
        int b = createAndGetId("{\"title\":\"B\",\"status\":\"DONE\"}");
        int c = createAndGetId("{\"title\":\"C\",\"status\":\"DONE\"}");

        move(c, "DONE", 0);

        java.util.List<Integer> ids = idsIn("DONE");
        org.assertj.core.api.Assertions.assertThat(ids.get(0)).isEqualTo(c);
        org.assertj.core.api.Assertions.assertThat(ids.subList(ids.size() - 2, ids.size())).containsExactly(a, b);
        assertNumberedFromOne(sortOrdersIn("DONE"));
    }

    @Test
    void 移動_別の列の指定した位置に入り_元の列は詰められる() throws Exception {
        int x = createAndGetId("{\"title\":\"X\",\"status\":\"TODO\"}");

        move(x, "IN_PROGRESS", 1);

        org.assertj.core.api.Assertions.assertThat(idsIn("IN_PROGRESS").get(1)).isEqualTo(x);
        org.assertj.core.api.Assertions.assertThat(idsIn("TODO")).doesNotContain(x);
        assertNumberedFromOne(sortOrdersIn("IN_PROGRESS"));
        assertNumberedFromOne(sortOrdersIn("TODO"));
    }

    @Test
    void 移動_位置が列の件数より大きいときは末尾に入る() throws Exception {
        int x = createAndGetId("{\"title\":\"X\",\"status\":\"TODO\"}");

        move(x, "DONE", 9999);

        java.util.List<Integer> ids = idsIn("DONE");
        org.assertj.core.api.Assertions.assertThat(ids.get(ids.size() - 1)).isEqualTo(x);
    }

    @Test
    void 移動_入力が不正なら400_存在しないidは404() throws Exception {
        int x = createAndGetId("{\"title\":\"X\"}");
        String[] badBodies = {
                "{}",
                "{\"status\":\"TODO\"}",
                "{\"index\":0}",
                "{\"status\":\"TODO\",\"index\":-1}",
                "{\"status\":\"XXX\",\"index\":0}",
                "{\"status\":",
        };
        for (String body : badBodies) {
            mvc.perform(put("/api/tasks/" + x + "/position").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
        mvc.perform(put("/api/tasks/999999/position").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"TODO\",\"index\":0}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 削除_消すと取得できなくなり_存在しないidは404() throws Exception {
        int id = createAndGetId("{\"title\":\"消すタスク\"}");

        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/tasks/" + id)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/tasks/" + id)).andExpect(status().isNotFound());
    }
}
