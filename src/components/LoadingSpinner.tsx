"use client";
import { CircularProgress, Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  size?: number;
  color?: "primary" | "secondary" | "inherit";
}

export function LoadingSpinner({
  size = 24,
  color = "primary",
}: LoadingSpinnerProps) {
  return <CircularProgress size={size} color={color} />;
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress size={48} sx={{ mb: 2, color: "primary.main" }} />
        <Typography variant="body1" color="text.secondary">
          {message || t("loading")}
        </Typography>
      </Box>
    </Box>
  );
}
