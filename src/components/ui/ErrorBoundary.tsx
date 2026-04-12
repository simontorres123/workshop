import React, { Component, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { Icon } from '@iconify/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Si se proporciona un fallback personalizado
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'string') {
          return (
            <Card>
              <CardContent>
                <Alert severity="error">
                  {this.props.fallback}
                </Alert>
              </CardContent>
            </Card>
          );
        }
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Icon 
                icon="eva:alert-triangle-outline" 
                width={48} 
                height={48} 
                style={{ color: '#f44336', marginBottom: 16 }} 
              />
              <Typography variant="h6" color="error" gutterBottom>
                Error al cargar el componente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {this.state.error?.message || 'Ha ocurrido un error inesperado'}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={this.handleRetry}
                startIcon={<Icon icon="eva:refresh-outline" />}
              >
                Reintentar
              </Button>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;