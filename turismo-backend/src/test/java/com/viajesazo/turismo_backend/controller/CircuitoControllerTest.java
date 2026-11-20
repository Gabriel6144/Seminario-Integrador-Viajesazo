package com.viajesazo.turismo_backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.viajesazo.turismo_backend.config.AppConfig;
import com.viajesazo.turismo_backend.dto.response.AlternativaItemResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoAlternativaResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoItemResponse;
import com.viajesazo.turismo_backend.dto.response.CircuitoSeleccionadoResponse;
import com.viajesazo.turismo_backend.dto.response.DiaCircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.GeneracionCircuitoResponse;
import com.viajesazo.turismo_backend.dto.response.OpcionSustitucionResponse;
import com.viajesazo.turismo_backend.dto.response.OpcionesSustitucionResponse;
import com.viajesazo.turismo_backend.dto.response.ParadaVecinaResponse;
import com.viajesazo.turismo_backend.dto.response.PropuestaFueraDeHuecoResponse;
import com.viajesazo.turismo_backend.exception.CircuitoDataMissingException;
import com.viajesazo.turismo_backend.exception.ConfirmationRequiredException;
import com.viajesazo.turismo_backend.exception.ResourceNotFoundException;
import com.viajesazo.turismo_backend.model.CircuitStrategy;
import com.viajesazo.turismo_backend.model.InteresCategoria;
import com.viajesazo.turismo_backend.model.TipoAcceso;
import com.viajesazo.turismo_backend.model.TipoRegistro;
import com.viajesazo.turismo_backend.service.CircuitoService;

@WebMvcTest(CircuitoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AppConfig.class)
class CircuitoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CircuitoService circuitoService;

    @Test
    @DisplayName("VZ-25: genera el circuito y responde 201")
    void generatesCircuit() throws Exception {
        when(circuitoService.generate(7L, false)).thenReturn(
                new CircuitoService.GenerationResult(
                        new GeneracionCircuitoResponse(null, null, List.of(), true,
                                "sin propuestas compatibles"),
                        false));

        mockMvc.perform(post("/api/viajes/7/circuito"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.distanciasEstimadas").value(true))
                .andExpect(jsonPath("$.alternativas").isArray());
    }

    @Test
    @DisplayName("VZ-25: regenerar con reemplazar=true responde 200")
    void replacesCircuitWhenConfirmed() throws Exception {
        when(circuitoService.generate(7L, true)).thenReturn(
                new CircuitoService.GenerationResult(
                        new GeneracionCircuitoResponse(null, null, List.of(), true, null),
                        true));

        mockMvc.perform(post("/api/viajes/7/circuito").param("reemplazar", "true"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("VZ-25: regenerar sin confirmación responde 409")
    void requiresConfirmationToRegenerate() throws Exception {
        when(circuitoService.generate(7L, false)).thenThrow(new ConfirmationRequiredException(
                "el circuito del viaje ya fue generado; confirmá con reemplazar=true para regenerarlo"));

        mockMvc.perform(post("/api/viajes/7/circuito"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("reemplazar=true")));
    }

    @Test
    @DisplayName("VZ-25: datos faltantes responde 422 con la lista de campos")
    void reportsMissingDataAsUnprocessableEntity() throws Exception {
        when(circuitoService.generate(7L, false)).thenThrow(
                new CircuitoDataMissingException(List.of("fecha de inicio", "preferencias de interés")));

        mockMvc.perform(post("/api/viajes/7/circuito"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.datosFaltantes[0]").value("fecha de inicio"))
                .andExpect(jsonPath("$.datosFaltantes[1]").value("preferencias de interés"));
    }

    @Test
    @DisplayName("VZ-25: consulta el circuito generado con itemId y disponibilidad actual")
    void findsCircuit() throws Exception {
        when(circuitoService.find(7L)).thenReturn(circuitResponse());

        mockMvc.perform(get("/api/viajes/7/circuito"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].itemId").value(10))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].descripcion").value("Descripción"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].categoria").value("CULTURA"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].disponible").value(false))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].motivoNoDisponible")
                        .value("la propuesta está cancelada"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].imagenes[0]")
                        .value("https://imagen.test/evento.jpg"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].ciudad").value("Córdoba"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].localidad").value("Nueva Córdoba"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].direccion")
                        .value("Av. Hipólito Yrigoyen 325"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].lugarRecinto")
                        .value("Paseo del Buen Pastor"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].latitud").value(-31.4))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].longitud").value(-64.2))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].tipoAcceso").value("DE_PAGO"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].montoEstimado").value(1500.0))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].descripcionArancel")
                        .value("Entrada general"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].sitioOficial")
                        .value("https://evento.test"))
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].duracionMinutos").value(60));
    }

    @Test
    @DisplayName("VZ-25: consultar un circuito inexistente devuelve 404")
    void returns404WhenCircuitMissing() throws Exception {
        when(circuitoService.find(404L))
                .thenThrow(new ResourceNotFoundException("El viaje todavía no tiene un circuito generado"));

        mockMvc.perform(get("/api/viajes/404/circuito"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("VZ-25: una estrategia de selección inexistente se rechaza con 400")
    void rejectsUnknownStrategy() throws Exception {
        mockMvc.perform(post("/api/viajes/7/circuito/seleccion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estrategia\":\"NO_EXISTE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("VZ-25: selecciona una alternativa del circuito")
    void selectsCircuitAlternative() throws Exception {
        when(circuitoService.select(eq(7L), any())).thenReturn(
                new GeneracionCircuitoResponse(null, CircuitStrategy.INTERESES, List.of(), true, null));

        mockMvc.perform(post("/api/viajes/7/circuito/seleccion")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estrategia\":\"INTERESES\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estrategiaSeleccionada").value("INTERESES"));
    }

    @Test
    @DisplayName("VZ-26: consulta el circuito seleccionado agrupado por día e incluye días vacíos")
    void findsSelectedCircuitGroupedByDay() throws Exception {
        when(circuitoService.selectedDetail(7L)).thenReturn(selectedCircuitResponse());

        mockMvc.perform(get("/api/viajes/7/circuito/seleccionado"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.circuitoId").value(1))
                .andExpect(jsonPath("$.viajeId").value(7))
                .andExpect(jsonPath("$.estrategia").value("INTERESES"))
                .andExpect(jsonPath("$.desactualizado").value(true))
                .andExpect(jsonPath("$.motivosDesactualizacion[0]").value("FECHAS"))
                .andExpect(jsonPath("$.dias[0].fecha").value("2026-11-01"))
                .andExpect(jsonPath("$.dias[0].items[0].itemId").value(15))
                .andExpect(jsonPath("$.dias[0].items[0].horaInicio").value("10:00:00"))
                .andExpect(jsonPath("$.dias[1].fecha").value("2026-11-02"))
                .andExpect(jsonPath("$.dias[1].items").isEmpty());
    }

    @Test
    @DisplayName("VZ-26: un circuito sin alternativa seleccionada devuelve 404")
    void returns404WhenSelectionMissing() throws Exception {
        when(circuitoService.selectedDetail(7L)).thenThrow(new ResourceNotFoundException(
                "El circuito del viaje todavía no tiene una alternativa seleccionada"));

        mockMvc.perform(get("/api/viajes/7/circuito/seleccionado"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("VZ-28: lista lo que entra en el hueco del día, con motivos y lo que no entra")
    void listsReplacementAlternatives() throws Exception {
        when(circuitoService.replacementAlternatives(7L, 15L)).thenReturn(substitutionResponse());

        mockMvc.perform(get("/api/viajes/7/circuito/seleccionado/items/15/alternativas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fecha").value("2026-10-20"))
                .andExpect(jsonPath("$.huecoInicio").value("10:00:00"))
                .andExpect(jsonPath("$.huecoFin").value("13:30:00"))
                .andExpect(jsonPath("$.paradaAnterior.propuestaNombre").value("Catedral"))
                .andExpect(jsonPath("$.opciones[0].propuestaId").value(3))
                .andExpect(jsonPath("$.opciones[0].propuestaNombre").value("Museo Histórico"))
                .andExpect(jsonPath("$.opciones[0].horaInicio").value("10:30:00"))
                .andExpect(jsonPath("$.opciones[0].meGusta").value(true))
                .andExpect(jsonPath("$.opciones[0].enIntereses").value(true))
                .andExpect(jsonPath("$.opciones[0].totalMeGusta").value(12))
                .andExpect(jsonPath("$.noEntran[0].motivo")
                        .value(org.hamcrest.Matchers.containsString("no entra")))
                .andExpect(jsonPath("$.mensaje").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    @DisplayName("VZ-28: reemplaza una parada y devuelve el circuito actualizado")
    void replacesSelectedItem() throws Exception {
        when(circuitoService.replaceSelectedItem(eq(7L), eq(15L), any()))
                .thenReturn(selectedCircuitResponse());

        mockMvc.perform(put("/api/viajes/7/circuito/seleccionado/items/15")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"propuestaId\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias[0].items[0].itemId").value(15));

        verify(circuitoService).replaceSelectedItem(eq(7L), eq(15L), any());
    }

    @Test
    @DisplayName("VZ-28: reemplazar sin propuesta responde 400")
    void rejectsReplacementWithoutProposal() throws Exception {
        mockMvc.perform(put("/api/viajes/7/circuito/seleccionado/items/15")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());

        verify(circuitoService, never()).replaceSelectedItem(any(), any(), any());
    }

    @Test
    @DisplayName("VZ-28: reemplazar una parada inexistente devuelve 404")
    void returns404WhenReplacementItemMissing() throws Exception {
        when(circuitoService.replaceSelectedItem(eq(7L), eq(404L), any())).thenThrow(
                new ResourceNotFoundException("No existe la parada con id 404 en el circuito seleccionado"));

        mockMvc.perform(put("/api/viajes/7/circuito/seleccionado/items/404")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"propuestaId\":3}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("VZ-29: elimina una parada confirmada y devuelve el circuito actualizado")
    void deletesSelectedItemWhenConfirmed() throws Exception {
        when(circuitoService.deleteSelectedItem(7L, 15L, true)).thenReturn(selectedCircuitResponse());

        mockMvc.perform(delete("/api/viajes/7/circuito/seleccionado/items/15")
                .param("confirmar", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias[0].items[0].itemId").value(15))
                .andExpect(jsonPath("$.dias[1].items").isEmpty());

        verify(circuitoService).deleteSelectedItem(7L, 15L, true);
    }

    @Test
    @DisplayName("VZ-29: eliminar sin confirmar responde 409 y conserva la parada")
    void requiresConfirmationToDeleteItem() throws Exception {
        when(circuitoService.deleteSelectedItem(7L, 15L, false)).thenThrow(
                new ConfirmationRequiredException(
                        "la eliminación de la parada requiere confirmación; confirmá con confirmar=true"));

        mockMvc.perform(delete("/api/viajes/7/circuito/seleccionado/items/15"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("confirmar=true")));
    }

    @Test
    @DisplayName("VZ-29: eliminar una parada inexistente devuelve 404")
    void returns404WhenItemMissing() throws Exception {
        when(circuitoService.deleteSelectedItem(7L, 404L, true)).thenThrow(new ResourceNotFoundException(
                "No existe la parada con id 404 en el circuito seleccionado"));

        mockMvc.perform(delete("/api/viajes/7/circuito/seleccionado/items/404")
                .param("confirmar", "true"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("antes de confirmar: lista reemplazos para una parada de una alternativa")
    void listsReplacementOptionsForAnAlternative() throws Exception {
        when(circuitoService.alternativeReplacementOptions(7L, CircuitStrategy.CERCANIA, 10L))
                .thenReturn(substitutionResponse());

        mockMvc.perform(get("/api/viajes/7/circuito/alternativas/CERCANIA/items/10/alternativas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opciones[0].propuestaId").value(3));
    }

    @Test
    @DisplayName("antes de confirmar: sustituye una parada y devuelve las alternativas")
    void replacesAnItemOfAnAlternative() throws Exception {
        when(circuitoService.replaceAlternativeItem(eq(7L), eq(CircuitStrategy.CERCANIA), eq(10L), any()))
                .thenReturn(circuitResponse());

        mockMvc.perform(put("/api/viajes/7/circuito/alternativas/CERCANIA/items/10")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"propuestaId\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].itemId").value(10));

        verify(circuitoService).replaceAlternativeItem(eq(7L), eq(CircuitStrategy.CERCANIA), eq(10L), any());
    }

    @Test
    @DisplayName("antes de confirmar: elimina una parada confirmada")
    void deletesAnItemOfAnAlternative() throws Exception {
        when(circuitoService.deleteAlternativeItem(7L, CircuitStrategy.CERCANIA, 10L, true))
                .thenReturn(circuitResponse());

        mockMvc.perform(delete("/api/viajes/7/circuito/alternativas/CERCANIA/items/10")
                .param("confirmar", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alternativas").isArray());

        verify(circuitoService).deleteAlternativeItem(7L, CircuitStrategy.CERCANIA, 10L, true);
    }

    @Test
    @DisplayName("antes de confirmar: una estrategia inexistente en la ruta responde 400")
    void rejectsUnknownStrategyInThePath() throws Exception {
        mockMvc.perform(delete("/api/viajes/7/circuito/alternativas/NO_EXISTE/items/10")
                .param("confirmar", "true"))
                .andExpect(status().isBadRequest());

        verify(circuitoService, never()).deleteAlternativeItem(any(), any(), any(), org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    @DisplayName("antes de confirmar: devuelve el estado de cada día de una alternativa")
    void listsDaySummariesOfAnAlternative() throws Exception {
        var resumen = new com.viajesazo.turismo_backend.dto.response.ResumenDiaCircuito(0, 4, 0, false,
                "Se asignaron 0 de 4 paradas pedidas para este día.", true, true);
        when(circuitoService.alternativeDaySummaries(7L, CircuitStrategy.CERCANIA)).thenReturn(List.of(
                new com.viajesazo.turismo_backend.dto.response.ResumenDiaAlternativaResponse(
                        LocalDate.of(2026, 10, 20), resumen)));

        mockMvc.perform(get("/api/viajes/7/circuito/alternativas/CERCANIA/dias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fecha").value("2026-10-20"))
                .andExpect(jsonPath("$[0].resumen.minimo").value(4))
                .andExpect(jsonPath("$[0].resumen.puedeCompletar").value(true));
    }

    @Test
    @DisplayName("antes de confirmar: lista sugerencias y agrega una al día de la alternativa")
    void completesADayOfAnAlternative() throws Exception {
        when(circuitoService.alternativeDaySuggestions(7L, CircuitStrategy.CERCANIA, LocalDate.of(2026, 10, 20)))
                .thenReturn(new com.viajesazo.turismo_backend.dto.response.SugerenciasDiaResponse(List.of(),
                        "No encontramos propuestas para completar este día"));
        when(circuitoService.addAlternativeSuggestedItem(eq(7L), eq(CircuitStrategy.CERCANIA),
                eq(LocalDate.of(2026, 10, 20)), any()))
                .thenReturn(circuitResponse());

        mockMvc.perform(get("/api/viajes/7/circuito/alternativas/CERCANIA/dias/2026-10-20/sugerencias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sugerencias").isEmpty())
                .andExpect(jsonPath("$.mensaje").value("No encontramos propuestas para completar este día"));

        mockMvc.perform(post("/api/viajes/7/circuito/alternativas/CERCANIA/dias/2026-10-20/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"propuestaId\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alternativas[0].propuestas[0].itemId").value(10));
    }

    private OpcionesSustitucionResponse substitutionResponse() {
        OpcionSustitucionResponse opcion = new OpcionSustitucionResponse(3L, "Museo Histórico", "Descripción",
                TipoRegistro.EVENTO, InteresCategoria.HISTORIA, "https://imagen.test/museo.jpg", "Córdoba",
                "Córdoba", "Av. Vélez Sarsfield 264", new BigDecimal("-31.42"), new BigDecimal("-64.18"),
                LocalTime.of(10, 30), LocalTime.of(11, 30), 60, true, 12L, true, 0.8, 2);
        ParadaVecinaResponse anterior = new ParadaVecinaResponse("Catedral", LocalTime.of(9, 0),
                LocalTime.of(10, 0), new BigDecimal("-31.41"), new BigDecimal("-64.19"));
        PropuestaFueraDeHuecoResponse noEntra = new PropuestaFueraDeHuecoResponse(9L, "Cena show",
                TipoRegistro.EVENTO, true,
                "Su horario (21:00 – 23:00) no entra entre 10:00 y 13:30 contando los traslados");
        return new OpcionesSustitucionResponse(LocalDate.parse("2026-10-20"), LocalTime.of(10, 0),
                LocalTime.of(13, 30), anterior, null, List.of(opcion), List.of(noEntra), null);
    }

    private CircuitoSeleccionadoResponse selectedCircuitResponse() {
        AlternativaItemResponse item = new AlternativaItemResponse(15L, 3L, "Museo Histórico",
                TipoRegistro.EVENTO, InteresCategoria.HISTORIA, "Córdoba", "Córdoba",
                "Av. Vélez Sarsfield 264", LocalTime.of(10, 0), LocalTime.of(12, 0), 120,
                com.viajesazo.turismo_backend.model.OrigenCircuitoItem.GENERADO);
        var resumen = new com.viajesazo.turismo_backend.dto.response.ResumenDiaCircuito(
                1, 4, 0, false, null, true, true);
        return new CircuitoSeleccionadoResponse(1L, 7L, null, CircuitStrategy.INTERESES, true,
                List.of("FECHAS"), true, null, List.of(
                        new DiaCircuitoResponse(LocalDate.parse("2026-11-01"), List.of(item), resumen),
                        new DiaCircuitoResponse(LocalDate.parse("2026-11-02"), List.of(),
                                new com.viajesazo.turismo_backend.dto.response.ResumenDiaCircuito(
                                        0, 4, 0, false, "incompleto", true, true))));
    }

    private GeneracionCircuitoResponse circuitResponse() {
        CircuitoItemResponse item = new CircuitoItemResponse(10L, 1L, "Evento", "Descripción",
                InteresCategoria.CULTURA, TipoRegistro.EVENTO, LocalDate.parse("2026-10-20"), 1,
                LocalTime.of(10, 0), LocalTime.of(11, 0), 2.5, 5, false,
                "la propuesta está cancelada", List.of("https://imagen.test/evento.jpg"), "Córdoba",
                "Nueva Córdoba", "Av. Hipólito Yrigoyen 325", "Paseo del Buen Pastor",
                BigDecimal.valueOf(-31.4), BigDecimal.valueOf(-64.2), TipoAcceso.DE_PAGO,
                BigDecimal.valueOf(1500), "Entrada general", "https://evento.test", 60);
        CircuitoAlternativaResponse alternative = new CircuitoAlternativaResponse(
                CircuitStrategy.CERCANIA, List.of(item), 2.5, 1.0,
                Set.of(InteresCategoria.CULTURA), null);
        return new GeneracionCircuitoResponse(null, null, List.of(alternative), false, null);
    }
}
