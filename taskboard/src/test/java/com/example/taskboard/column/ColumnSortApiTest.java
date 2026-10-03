package com.example.taskboard.column;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
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
class ColumnSortApiTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ColumnSortRepository repository;

    @BeforeEach
    void 保存済みの並び順を空にする() {
        repository.deleteAll();
        repository.flush();
    }

    @Test
    void 取得_まだ選ばれていないカラムは手動() throws Exception {
        mvc.perform(get("/api/columns/TODO/sort"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.sort").value("MANUAL"));
        org.assertj.core.api.Assertions.assertThat(repository.count()).isZero();
    }

    @Test
    void 変更_選んだ並び順が保存され_カラムごとに別々に持てる() throws Exception {
        mvc.perform(put("/api/columns/TODO/sort").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sort\":\"DUE_DATE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.sort").value("DUE_DATE"));
        mvc.perform(put("/api/columns/DONE/sort").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sort\":\"CATEGORY\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/columns/TODO/sort")).andExpect(jsonPath("$.sort").value("DUE_DATE"));
        mvc.perform(get("/api/columns/DONE/sort")).andExpect(jsonPath("$.sort").value("CATEGORY"));
        mvc.perform(get("/api/columns/IN_PROGRESS/sort")).andExpect(jsonPath("$.sort").value("MANUAL"));
    }

    @Test
    void 変更_もう一度選ぶと上書きされる() throws Exception {
        for (String sort : new String[] {"PRIORITY", "CATEGORY", "MANUAL"}) {
            mvc.perform(put("/api/columns/IN_PROGRESS/sort").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"sort\":\"" + sort + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.sort").value(sort));
        }
        mvc.perform(get("/api/columns/IN_PROGRESS/sort")).andExpect(jsonPath("$.sort").value("MANUAL"));
        org.assertj.core.api.Assertions.assertThat(repository.count()).isEqualTo(1);
    }

    @Test
    void 状態が不正なら400() throws Exception {
        mvc.perform(get("/api/columns/XXX/sort"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(put("/api/columns/XXX/sort").contentType(MediaType.APPLICATION_JSON)
                .content("{\"sort\":\"MANUAL\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 並び順が無い_不正_壊れたJSONなら400() throws Exception {
        mvc.perform(put("/api/columns/TODO/sort").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("sort"))
                .andExpect(jsonPath("$.errors[0].message").value("並び順(sort)を指定してください"));
        for (String body : new String[] {"{\"sort\":\"XXX\"}", "{\"sort\":", "{\"sort\":null}"}) {
            mvc.perform(put("/api/columns/TODO/sort").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
        org.assertj.core.api.Assertions.assertThat(repository.count()).isZero();
    }
}
