"use client";

import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  "¿Cómo registro una orden de reparación?",
  "¿Qué reparaciones requieren atención?",
  "¿Cómo agrego una refacción a una orden?",
];

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function AssistantMark() {
  return (
    <Box
      className="assistant-mark"
      aria-hidden="true"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        background: "transparent",
        flexShrink: 0,
      }}
    >
      <Box component="svg" viewBox="0 0 48 48" sx={{ width: 34, height: 34 }}>
        <path
          d="M10 15.5h19.5c4.4 0 8 3.6 8 8v5.2c0 4.4-3.6 8-8 8H19l-7.3 5.2 1.2-5.4A8 8 0 0 1 6 28.7v-5.2c0-4.4 1.8-8 4-8Z"
          fill="none"
          stroke="#212B36"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="27" r="1.8" fill="#212B36" />
        <circle cx="23" cy="27" r="1.8" fill="#212B36" />
        <circle cx="29.5" cy="27" r="1.8" fill="#212B36" />
        <path d="M34 8.5c.7 5.3 3.1 7.7 8.5 8.4-5.4.7-7.8 3.1-8.5 8.4-.7-5.3-3.1-7.7-8.5-8.4 5.4-.7 7.8-3.1 8.5-8.4Z" fill="#00A76F" />
        <path d="m17 9 3 3M40 30l3 3" stroke="#00A76F" strokeWidth="2.6" strokeLinecap="round" />
      </Box>
    </Box>
  );
}

export default function VirtualAssistant() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hola, soy tu asistente virtual. Puedo ayudarte con el uso de la plataforma y consultar información autorizada de tu taller.",
    },
  ]);
  const endOfMessagesRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async (messageOverride?: string) => {
    const message = (messageOverride ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: createMessageId(), role: "user", content: message },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo obtener una respuesta.");
      }

      const answer = payload?.answer || payload?.response || payload?.message;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("El asistente no devolvió una respuesta válida.");
      }
      setMessages((current) => [
        ...current,
        { id: createMessageId(), role: "assistant", content: answer.trim() },
      ]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "No se pudo conectar con el asistente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  return (
    <>
      <Tooltip title="Asistente virtual">
        <Button
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente virtual"
          sx={{
            minWidth: { xs: 36, sm: "auto" },
            width: { xs: 36, sm: "auto" },
            height: 36,
            px: { xs: 0, sm: 0.75 },
            borderRadius: { xs: "50%", sm: 2.5 },
            color: "text.primary",
            border: "none",
            bgcolor: "transparent",
            textTransform: "none",
            fontWeight: 700,
            gap: 1,
            "&:hover": {
              bgcolor: "transparent",
              "& .assistant-mark svg": { transform: "scale(1.04)" },
            },
          }}
        >
          <AssistantMark />
        </Button>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            minHeight: { xs: "100dvh", sm: 620 },
            maxHeight: { xs: "100dvh", sm: "calc(100dvh - 48px)" },
          },
        }}
      >
        <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <AssistantMark />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Asistente virtual</Typography>
                <AutoAwesomeIcon sx={{ color: "secondary.main", fontSize: 18 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">Ayuda rápida para tu taller</Typography>
            </Box>
            <IconButton onClick={() => setOpen(false)} aria-label="Cerrar asistente">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Stack spacing={1.5} sx={{ flex: 1, overflowY: "auto", pr: 0.5, pb: 1 }}>
            {messages.map((message) => (
              <Stack key={message.id} direction="row" justifyContent={message.role === "user" ? "flex-end" : "flex-start"}>
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: "88%",
                    px: 1.75,
                    py: 1.25,
                    borderRadius: 2.5,
                    bgcolor: message.role === "user" ? "primary.main" : "grey.100",
                    color: message.role === "user" ? "primary.contrastText" : "text.primary",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.55 }}>{message.content}</Typography>
                </Paper>
              </Stack>
            ))}
            {loading && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "text.secondary", px: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Escribiendo respuesta…</Typography>
              </Stack>
            )}
            <div ref={endOfMessagesRef} />
          </Stack>

          {messages.length === 1 && (
            <Box sx={{ pt: 1 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {QUICK_QUESTIONS.map((question) => (
                  <Chip
                    key={question}
                    icon={<HelpOutlineRoundedIcon />}
                    label={question}
                    onClick={() => void sendMessage(question)}
                    variant="outlined"
                    sx={{ maxWidth: "100%", height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {error && (
            <Typography color="error.main" variant="caption" sx={{ pt: 1 }}>{error}</Typography>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1.5 }}>
            <TextField
              fullWidth
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu pregunta…"
              disabled={loading}
              inputProps={{ maxLength: 2000, "aria-label": "Pregunta para el asistente" }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" color="primary" disabled={!input.trim() || loading} aria-label="Enviar pregunta">
                      <SendRoundedIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
