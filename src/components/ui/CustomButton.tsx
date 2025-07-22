import * as React from 'react';
import Button, { ButtonProps } from '@mui/material/Button';
import { styled } from '@mui/material/styles';

const StyledButton = styled(Button)<ButtonProps>(({ theme }) => ({
  margin: theme.spacing(1),
  padding: theme.spacing(1, 3),
}));

export default function CustomButton(props: ButtonProps) {
  return <StyledButton {...props} />;
}
