"use client";

import * as React from "react";
import { Box, Dialog, DialogTitle, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import Close from "@mui/icons-material/Close";
import { useAuthStore } from "@/store/auth.store";
import GuidedAssistant from "./GuidedAssistant";

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
  const identity = useAuthStore(state => [state.user?.id, state.profile?.organization_id, state.profile?.role, state.activeBranchId].join(":"));
  return <>
    <Tooltip title="Asistente del taller">
      <IconButton onClick={() => setOpen(true)} aria-label="Abrir asistente virtual" sx={{ width: 40, height: 40, color: "text.primary" }}><AssistantMark /></IconButton>
    </Tooltip>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="guided-assistant-title"
      PaperProps={{ sx: { m: { xs: 0, sm: 3 }, width: { xs: "100%", sm: "calc(100% - 48px)" }, height: { xs: "100dvh", sm: "min(760px, calc(100dvh - 48px))" }, maxHeight: { xs: "100dvh", sm: "calc(100dvh - 48px)" }, borderRadius: { xs: 0, sm: 3 }, display: "flex", overflow: "hidden", pt: "env(safe-area-inset-top)" } }}>
      <DialogTitle component="div" sx={{ p: { xs: 2, sm: 2.5 }, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" gap={1.25}>
          <AssistantMark />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="guided-assistant-title" component="h2" variant="h6" sx={{ fontWeight: 800, fontSize: { xs: 18, sm: 20 } }}>Asistente del taller</Typography>
            <Typography variant="body2" color="text.secondary">Consulta y aprende, paso a paso</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} aria-label="Cerrar asistente" sx={{ width: 44, height: 44 }}><Close /></IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      {open && <GuidedAssistant key={identity} />}
    </Dialog>
  </>;
}
