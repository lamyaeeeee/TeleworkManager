import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

export const AjouterButton = styled(Button)({
    width: 'auto',
    boxShadow: 'none',
    textTransform: 'none',
    fontSize: '16px',
    borderRadius: '25px',
    padding: '9px 30px',
    border: '1px solid',
    lineHeight: '1.5',
    backgroundColor: '#118ec5',
    borderColor: '#118ec5',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#007EB5',
      borderColor: '#007EB5',
      boxShadow: 'none',
    },
    '&:active': {
      boxShadow: 'none',
      backgroundColor: '#007EB5',
      borderColor: '#007EB5',
    },
  });
  export const AnnulerButton = styled(Button)({
    width: 'auto',
    boxShadow: 'none',
    textTransform: 'none',
    fontSize: '16px',
    borderRadius: '25px', 
    padding: '8px 18px', 
    border: '1px solid', 
    color: '#1976d2', 
    borderColor: '#1976d2', 
    backgroundColor: 'transparent', 
    '&:hover': {
      backgroundColor: '#e3f2fd', 
      borderColor: '#1976d2', 
      boxShadow: 'none',
    },
    '&:active': {
      backgroundColor: '#bbdefb', 
      borderColor: '#1976d2', 
      boxShadow: 'none',
    },
  });