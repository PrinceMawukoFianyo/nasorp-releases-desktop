export function formatDate(date: Date | string | null): 
string{
    if(!date) return "-";
    return dateFnsFormat(new Date(date), "MM d, yyyy");
} 
 
 export function formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }