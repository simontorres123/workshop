import * as React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledButton = styled(Button)<ButtonProps>(({ theme, variant = 'contained' }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 700,
  boxShadow: 'none',
  padding: theme.spacing(1.5, 3),
  
  ...(variant === 'contained' && {
    color: '#fff',
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: '0 8px 16px 0 rgba(0, 167, 111, 0.24)',
    },
  }),
  
  ...(variant === 'outlined' && {
    border: `1px solid ${theme.palette.grey[300]}`,
    '&:hover': {
      backgroundColor: theme.palette.grey[50],
      boxShadow: '0 8px 16px 0 rgba(145, 158, 171, 0.16)',
    },
  }),
  
  ...(variant === 'text' && {
    '&:hover': {
      backgroundColor: 'transparent',
    },
  }),
}));

export default function CustomButton(props: ButtonProps) {
  return <StyledButton {...props} />;
}
