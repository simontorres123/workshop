import * as React from 'react';
import { Card, CardContent, Typography, Box, alpha, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  color = 'primary' 
}: StatCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Card
      sx={{
        p: isMobile ? 2 : 3,
        display: 'flex',
        alignItems: 'center',
        boxShadow: 'none',
        border: '1px solid',
        borderColor: alpha(theme.palette.grey[500], 0.12),
        '&:hover': {
          boxShadow: '0 2px 16px 0 rgba(145, 158, 171, 0.16)',
        },
      }}
    >
      <Box
        sx={{
          width: isMobile ? 48 : 64,
          height: isMobile ? 48 : 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette[color].main, 0.08),
          color: `${color}.dark`,
          mr: isMobile ? 2 : 3,
        }}
      >
        {React.cloneElement(icon as React.ReactElement, {
          width: isMobile ? 20 : 24,
          height: isMobile ? 20 : 24
        })}
      </Box>
      
      <Box sx={{ flexGrow: 1 }}>
        <Typography 
          variant={isMobile ? "h4" : "h3"} 
          sx={{ mb: 0.5 }}
        >
          {value}
        </Typography>
        <Typography
          variant={isMobile ? "caption" : "body2"}
          sx={{ 
            color: 'text.secondary',
            textTransform: 'capitalize',
            lineHeight: isMobile ? 1.2 : 1.43
          }}
        >
          {title}
        </Typography>
      </Box>
    </Card>
  );
}
